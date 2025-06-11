import { Client } from "@stable-canvas/comfyui-client";
import { BaseFlow } from "../Baseflow";
import { FileInput } from "../types";
import { loadFileInput } from "../common";

const caption_types = [
  "Descriptive",
  "Descriptive(Casual)",
  "Straightforward",
  "Stable Diffusion Prompt",
  "MidJourney",
  "Danbooru tag list",
  "e621 tag list",
  "Rule34 tag list",
  "Booru-like tag list",
  "Art Critic",
  "Product Listing",
  "Social Media Post",
] as const;

const caption_lengths = [
  "any",
  "very short",
  "short",
  "medium-lenath",
  "long",
  "very long",
  "20",
  "30",
  "40",
  "50",
  "60",
  "70",
  "80",
  "90",
  "100",
  "110",
  "120",
  "130",
  "140",
  "150",
  "160",
  "170",
  "180",
  "190",
  "200",
  "210",
  "220",
  "230",
  "240",
  "250",
] as const;

export class JoyCaption3Flow extends BaseFlow<{
  images: FileInput[];
  quantization_mode?: "bf16" | "nf4" | "int8";
  device?: "cuda" | "cpu";
  caption_type?: (typeof caption_types)[number];
  caption_length?: (typeof caption_lengths)[number];
  user_prompt?: string;
}> {
  constructor(client: Client) {
    super(client, async (payload, cls) => {
      const images_buff = await Promise.all(payload.images.map(loadFileInput));
      const [OUT_0_3] = cls.Base64ToImage({
        base64Images: JSON.stringify(
          images_buff.map((b) => b.toString("base64"))
        ),
      });
      const [OUT_0_2] = cls["LayerUtility: LoadJoyCaptionBeta1Model"]({
        model: "fancyfeast/llama-joycaption-beta-one-hf-llava",
        quantization_mode: payload.quantization_mode ?? "bf16",
        device: payload.device ?? "cuda",
      });
      const [OUT_0_1] = cls["LayerUtility: JoyCaptionBeta1"]({
        caption_type: payload.caption_type ?? "Stable Diffusion Prompt",
        caption_length: payload.caption_length ?? "long",
        max_new_tokens: 512,
        top_p: 0.9,
        top_k: 0,
        temperature: 0.6,
        user_prompt: payload.user_prompt ?? "",
        image: OUT_0_3,
        joycaption_beta1_model: OUT_0_2,
      });
      const [] = cls["easy showAnything"]({
        anything: OUT_0_1,
      });
    });

    // TODO
    this.resolver = (acc, out) => {
      return {
        ...acc,
        data: {
          ...(acc.data || {}),
          ...out,
        },
      };
    };
  }
}
