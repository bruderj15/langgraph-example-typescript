import { START, END, StateGraph, Annotation } from "@langchain/langgraph";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

const AgentState = Annotation.Root({
  user_name: Annotation<string | undefined>(),
  pizza_name: Annotation<string | undefined>(),
  output: Annotation<string[]>(),
});

const ASK_USER_NAME_NODE = "ask_user_name";
async function askUserName(state: any) {
  const name = await rl.question("Q: What's your name?\n");
  console.info("A:", name);
  state.user_name = name;
  return state;
}

const GREETING_NODE = "greeting";
async function greetingNode(state: any) {
  state.output.push(`Hello, ${state.user_name}!`);
  return state;
}

const ASK_PIZZA_NAME_NODE = "ask_pizza_name";
async function askPizzaName(state: any) {
  const pizza = await rl.question("Q: What pizza do you want to order?\n");
  console.info("A:", pizza);
  state.pizza_name = pizza;
  return state;
}

function shouldAskUserName(state: any) {
  return state.user_name ? GREETING_NODE : ASK_USER_NAME_NODE;
}

const graph = new StateGraph(AgentState)
  .addNode(ASK_USER_NAME_NODE, askUserName)
  .addNode(GREETING_NODE, greetingNode)
  .addNode(ASK_PIZZA_NAME_NODE, askPizzaName)
  .addConditionalEdges(START, shouldAskUserName)
  .addEdge(ASK_USER_NAME_NODE, GREETING_NODE)
  .addEdge(ASK_USER_NAME_NODE, GREETING_NODE)
  .addEdge(GREETING_NODE, ASK_PIZZA_NAME_NODE)
  .addEdge(ASK_PIZZA_NAME_NODE, END);

const app = graph.compile();

(async () => {
  const result = await app.invoke({ output: [] });
  console.log("Final:", result);
  rl.close();
  process.exit(0);
})();
