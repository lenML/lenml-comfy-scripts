import {
  Client,
  Workflow,
  WorkflowOutputResolver,
} from "@stable-canvas/comfyui-client";
import { uniq } from "./common";

export class BaseFlow<Payload = unknown> {
  resolver: WorkflowOutputResolver = (acc, out) => {
    return {
      ...acc,
      data: {
        ...(acc.data || {}),
        ...out,
      },
    };
  };

  constructor(
    readonly client: Client,
    readonly builder: (
      payload: Payload,
      cls: Workflow["classes"],
      wk: Workflow
    ) => void | Promise<void>
  ) {}

  async run(
    payload: Payload,
    options?: {
      ping: boolean;
      check_dependents: boolean;
    }
  ) {
    if (options?.ping && !(await this.ping()).ok) {
      throw new Error("ComfyUI 服务不可用");
    }
    if (options?.check_dependents) {
      const { missing, dependents } = await this.checkDependents(payload);
      if (missing.length > 0) {
        throw new Error(`缺少依赖节点: ${missing.join(", ")}`);
      }
    }
    const wk = new Workflow();
    await this.builder(payload, wk.classes, wk);
    return await wk.invoke(this.client, {
      resolver: this.resolver,
    });
  }

  async ping() {
    const start_time = Date.now();
    let ok = false;
    try {
      await this.client.getQueue();
      ok = true;
    } finally {
      return {
        ok,
        time: Date.now() - start_time,
      };
    }
  }

  async getWorkflow(payload: Payload) {
    const wk = new Workflow();
    await this.builder(payload, wk.classes, wk);
    return wk.workflow().prompt;
  }

  async getDependents(payload: Payload) {
    return uniq(
      Object.values(await this.getWorkflow(payload)).map((x) => x.class_type)
    );
  }

  async checkDependents(payload: Payload) {
    // 检查节点是否都存在
    const nodes = await this.client.getNodeDefs();
    const node_names = Object.values(nodes).map((x) => x.name);
    const dependents = await this.getDependents(payload);

    const missing: string[] = [];
    for (const dep of dependents) {
      if (node_names.includes(dep)) continue;
      missing.push(dep);
    }

    return { missing, dependents };
  }
}
