import { Client } from "@stable-canvas/comfyui-client";
import { JoyCaption3Flow } from "../src/main";
import mri from "mri";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { WebSocket } from "ws";
import { tqdm, range } from "@zzkit/tqdm";

const client = new Client({
  // api_base: "xxx",
  fetch,
  WebSocket,
});

type Job = {
  filename: string;
  filepath: string;
  caption_filepath: string;
  caption: string;
  prefix_caption: string;
};

async function main({
  input_dir,
  write_caption_text = false,
  batch_size = 4,
  prefix_caption = "",
  clean_mem = false,
}: {
  input_dir: string;
  write_caption_text: boolean;
  batch_size?: number;
  prefix_caption?: string;
  clean_mem?: boolean;
}) {
  if (!input_dir) {
    throw new Error("input_dir is required");
  }
  if (!path.isAbsolute(input_dir)) {
    input_dir = path.join(process.cwd(), input_dir);
  }
  if (!fs.existsSync(input_dir)) {
    throw new Error(`File not found: ${input_dir}`);
  }

  await client.connect();
  if (clean_mem) await client.free({ unload_models: true, free_memory: true });

  const flow1 = new JoyCaption3Flow(client);

  const files = fs.readdirSync(input_dir).filter((x) => {
    return [".png", ".jpeg", ".jpg", ".webp"].some((y) =>
      x.toLowerCase().endsWith(y)
    );
  });
  const jobs = files.map((fn) => {
    const filepath = path.join(input_dir, fn);
    const filename = path.basename(filepath);
    const caption_filename = filename.replace(path.extname(filename), ".txt");
    const caption_filepath = path.join(input_dir, caption_filename);
    let caption = "";
    // if (fs.existsSync(caption_filepath)) {
    //   caption = fs.readFileSync(caption_filepath, "utf-8");
    // }
    return {
      filename,
      filepath,
      caption_filename,
      caption_filepath,
      caption,
      prefix_caption,
    } as Job;
  });
  const batches = jobs
    // 只处理未标注的
    .filter((x) => fs.existsSync(x.caption_filepath) === false)
    .reduce((acc, job, i) => {
      const batch = Math.floor(i / batch_size);
      if (!acc[batch]) {
        acc[batch] = [];
      }
      acc[batch].push(job);
      return acc;
    }, [] as Job[][]);

  // 其实batch似乎没有用...好像实现里面还是根据顺序一个一个识别...
  for (const batch of tqdm(batches, {
    desc: "Batching",
  })) {
    const output = await flow1.run({
      images: batch.map((fp) => ({
        filepath: fp.filepath,
      })),
    });
    const texts: string[] = output.data?.text ?? [];
    texts.forEach((caption, idx) => {
      batch[idx].caption = caption;
    });

    for (const item of batch) {
      if (write_caption_text) {
        fs.writeFileSync(
          item.caption_filepath,
          item.prefix_caption + ", " + item.caption,
          "utf-8"
        );
      }
    }
  }
}

/**
 * usage:
 *
 * npx tsx ./scripts/runJoyCaption3.ts --input_dir=./input_data/ --write_caption_text --prefix_caption="xxxx"
 */
main(mri(process.argv.slice(2)))
  .then((msg: any) => {
    console.log("done", msg ?? "");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    client.disconnect();
  });
