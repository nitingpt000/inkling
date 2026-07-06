export type InklingCommand = "chat" | "init" | "update";

export type InklingRunResult = {
  command: InklingCommand;
  model: string;
  skipped?: boolean;
};

export type InklingRunEvent =
  | {
      source?: "main" | "subgraph";
      type: "text";
      text: string;
    }
  | {
      type: "tool_start";
      call: string;
      id: string;
      input: unknown;
      name: string;
    }
  | {
      type: "tool_end";
      id: string;
      name: string;
      status: "error" | "finished";
    }
  | {
      type: "debug";
      message: string;
    };

export type InklingRunOptions = {
  debug?: boolean;
  isFollowup?: boolean;
  modelId?: string | null;
  onEvent?: (event: InklingRunEvent) => void;
  threadId?: string;
  userMessage?: string | null;
};

export type UpdateMetadata = {
  updatedAt: string;
  command: InklingCommand;
  gitHead?: string;
  model: string;
};

export type RunContext = {
  lastUpdate: UpdateMetadata | null;
  gitSummary: string;
};
