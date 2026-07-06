import { isValidModelId, normalizeModelId } from "./constants.js";
import type { InklingCommand } from "./agent/types.js";

export type HelpRow = {
  label: string;
  description: string;
};

export type HelpContent = {
  title: string;
  description: string;
  usage: string[];
  commands: HelpRow[];
  options: HelpRow[];
  developmentOptions: HelpRow[];
  examples: string[];
  developmentExamples: string[];
};

export type LocalSubcommand = "export" | "search" | "validate";

export const LOCAL_SUBCOMMANDS: readonly LocalSubcommand[] = [
  "export",
  "search",
  "validate",
];

export type CliCommand =
  | { kind: "help"; exitCode: 0 }
  | {
      kind: "run";
      exitCode: 0;
      command: InklingCommand;
      dryRun: boolean;
      modelId: string | null;
      print: boolean;
      shouldStart: boolean;
      userMessage: string | null;
    }
  | {
      kind: "local";
      exitCode: 0;
      subcommand: LocalSubcommand;
      args: string[];
    }
  | {
      kind: "error";
      exitCode: 1;
      message: string;
    };

function isLocalSubcommand(
  value: string | undefined,
): value is LocalSubcommand {
  return (
    value !== undefined &&
    (LOCAL_SUBCOMMANDS as readonly string[]).includes(value)
  );
}

export function parseCommand(argv: string[]): CliCommand {
  if (argv[0] === "--help" || argv[0] === "-h") {
    return { kind: "help", exitCode: 0 };
  }

  if (isLocalSubcommand(argv[0])) {
    const rest = argv.slice(1);

    if (rest.includes("--help") || rest.includes("-h")) {
      return { kind: "help", exitCode: 0 };
    }

    return {
      kind: "local",
      exitCode: 0,
      subcommand: argv[0],
      args: rest,
    };
  }

  let dryRun = false;
  let modelId: string | null = null;
  let print = false;
  let command: InklingCommand = "chat";
  const userMessageParts: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      return { kind: "help", exitCode: 0 };
    }

    if (arg === "--dry-run") {
      if (!isDevelopmentMode()) {
        return {
          kind: "error",
          exitCode: 1,
          message: `Unknown option: ${arg}`,
        };
      }

      dryRun = true;
      continue;
    }

    if (arg === "--print" || arg === "-p") {
      print = true;
      continue;
    }

    if (arg === "--init" || arg === "--update") {
      const nextCommand = arg === "--init" ? "init" : "update";

      if (command !== "chat" && command !== nextCommand) {
        return {
          kind: "error",
          exitCode: 1,
          message: "--init and --update cannot be used together.",
        };
      }

      command = nextCommand;
      continue;
    }

    if (arg === "--modelId" || arg === "--model-id") {
      const nextArg = argv[index + 1];

      if (!nextArg || nextArg.startsWith("-")) {
        return {
          kind: "error",
          exitCode: 1,
          message: `${arg} requires a model ID.`,
        };
      }

      const parsedModelId = normalizeModelId(nextArg);

      if (!isValidModelId(parsedModelId)) {
        return {
          kind: "error",
          exitCode: 1,
          message: `Invalid model ID: ${nextArg}`,
        };
      }

      modelId = parsedModelId;
      index += 1;
      continue;
    }

    if (arg.startsWith("--modelId=") || arg.startsWith("--model-id=")) {
      const [, rawModelId = ""] = arg.split("=", 2);
      const parsedModelId = normalizeModelId(rawModelId);

      if (!isValidModelId(parsedModelId)) {
        return {
          kind: "error",
          exitCode: 1,
          message: `Invalid model ID: ${rawModelId}`,
        };
      }

      modelId = parsedModelId;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        kind: "error",
        exitCode: 1,
        message: `Unknown option: ${arg}`,
      };
    }

    userMessageParts.push(arg);
  }

  const userMessage =
    userMessageParts.length > 0 ? userMessageParts.join(" ") : null;
  const shouldStart = command !== "chat" || userMessage !== null;

  if (print && !shouldStart) {
    return {
      kind: "error",
      exitCode: 1,
      message: "-p, --print requires a message, --init, or --update.",
    };
  }

  return {
    kind: "run",
    exitCode: 0,
    command,
    dryRun,
    modelId,
    print,
    shouldStart,
    userMessage,
  };
}

export function isDevelopmentMode(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.INKLING_DEV === "1"
  );
}

export const helpContent: HelpContent = {
  title: "Inkling",
  description:
    "Run a documentation agent that generates and maintains a project wiki.",
  usage: [
    "inkling [--modelId <model>]",
    "inkling [--modelId <model>] [message]",
    "inkling --init [message]",
    "inkling --update [message]",
    "inkling export [dir]",
    "inkling search <query>",
    "inkling validate",
  ],
  commands: [
    {
      label: "inkling",
      description: "Open the interactive Inkling chat.",
    },
    {
      label: "inkling export [dir]",
      description:
        "Render the wiki to a static HTML site (default: inkling-site).",
    },
    {
      label: "inkling search <query>",
      description: "Search the generated wiki for a term.",
    },
    {
      label: "inkling validate",
      description: "Check the wiki for broken links and orphan pages.",
    },
  ],
  options: [
    {
      label: "--init",
      description: "Generate initial Inkling documentation.",
    },
    {
      label: "--update",
      description: "Update existing Inkling documentation.",
    },
    {
      label: "-p, --print",
      description: "Run once and print the final assistant output.",
    },
    {
      label: "--modelId <id>",
      description: "Use a model ID for this run.",
    },
  ],
  developmentOptions: [
    {
      label: "--dry-run",
      description: "Show what would run without invoking the agent.",
    },
  ],
  examples: [
    "inkling",
    "inkling --init",
    "inkling --update",
    'inkling "What can you do?"',
    'inkling -p "Summarize what Inkling can do"',
    "inkling --modelId gpt-5.5",
    'inkling --update --modelId gpt-5.5 "Please document the API routes first"',
    "inkling export ./site",
    'inkling search "authentication"',
    "inkling validate",
  ],
  developmentExamples: ["inkling --dry-run"],
};

export function getHelpText(): string {
  const helpSections = [
    helpContent.title,
    `  ${helpContent.description}`,
    "",
    "Usage",
    ...helpContent.usage.map((line) => `  ${line}`),
    "",
    "Commands",
    ...formatRows(helpContent.commands),
    "",
    "Options",
    ...formatRows(helpContent.options),
    "",
  ];

  if (isDevelopmentMode()) {
    helpSections.push(
      "Development Options",
      ...formatRows(helpContent.developmentOptions),
      "",
    );
  }

  helpSections.push(
    "Examples",
    ...helpContent.examples.map((line) => `  ${line}`),
  );

  if (isDevelopmentMode()) {
    helpSections.push(
      ...helpContent.developmentExamples.map((line) => `  ${line}`),
    );
  }

  return helpSections.join("\n");
}

function formatRows(rows: HelpRow[]): string[] {
  const labelWidth = Math.max(...rows.map((row) => row.label.length));

  return rows.map(
    (row) => `  ${row.label.padEnd(labelWidth)}  ${row.description}`,
  );
}
