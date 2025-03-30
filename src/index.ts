import { HttpRequest } from "@azure/functions";
// Define Context type locally if needed
type Context = {
  log: (...args: any[]) => void;
  res?: {
    status?: number;
    headers?: { [key: string]: string };
    body?: any;
  };
};

type AzureFunction = (context: Context, req: HttpRequest) => Promise<void>;
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
const CLIENT_PUBLIC_KEY = process.env.CLIENT_PUBLIC_KEY;

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const sig = req.headers["x-signature-ed25519"];
  const time = req.headers["x-signature-timestamp"];
  const rawBody = req.body ? await streamToString(req.body) : "";
  const isValid = await verifyKey(rawBody, sig, time, CLIENT_PUBLIC_KEY);

  if (!isValid) {
    context.res = {
      status: 401,
      headers: {
      "Content-Type": "application/json",
      },
      body: JSON.stringify({
      error: "Invalid request signature",
      }),
    };
    return;
  }

  const interaction = JSON.parse(rawBody);
  if (interaction && interaction.type === InteractionType.APPLICATION_COMMAND) {
    const option = interaction.data.options[0].value;
    const username = interaction.member.user.username;
    const not = option == "yes" ? "" : "'t";

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `${username}「${option} we can${not}」`,
        },
      }),
    };
  } else {
    context.res = {
      body: JSON.stringify({
        type: InteractionResponseType.PONG,
      }),
    };
  }
};

function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  return reader.read().then(function processText({ done, value }): any {
    if (done) {
      return result;
    }
    result += decoder.decode(value, { stream: true });
    return reader.read().then(processText);
  });
}

export default httpTrigger;