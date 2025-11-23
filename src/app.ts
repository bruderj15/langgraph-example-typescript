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
  const name = await rl.question("ChatBot: What's your name?\n");
  console.info("Received:", name);
  state.user_name = name;
  return state;
}

function shouldAskUserName(state: any) {
  return state.user_name ? GREETING_NODE : ASK_USER_NAME_NODE;
}

interface PizzaData {
  id: number;
  name: String;
}
async function shouldAskPizzaName(state: any) {
  const getPizzasRes = await fetch(
    "https://demos.swe.htwk-leipzig.de/pizza-api/pizza",
  );
  if (!getPizzasRes.ok) {
    throw new Error(`Request failed with status ${getPizzasRes.status}`);
  }

  const valid_pizzas: PizzaData[] = (await getPizzasRes.json()) as PizzaData[];
  if (!state.pizza_name) {
    return ASK_PIZZA_NAME_NODE;
  } else {
    let valid_pizza_names = valid_pizzas.map((pizza) => pizza.name);
    let is_valid = valid_pizza_names.some(
      (pizza_name) => pizza_name == state.pizza_name,
    );
    if (is_valid) {
      return END;
    } else {
      console.info(
        `Pizza '${state.pizza_name}' is invalid. Try any of: '${valid_pizza_names}'`,
      );
      return ASK_PIZZA_NAME_NODE;
    }
  }
}

const GREETING_NODE = "greeting";
async function greetingNode(state: any) {
  state.output.push(`Hello, ${state.user_name}!`);
  return state;
}

const ASK_PIZZA_NAME_NODE = "ask_pizza_name";
async function askPizzaName(state: any) {
  const pizza = await rl.question(
    "ChatBot: What pizza do you want to order?\n",
  );
  console.info("Received:", pizza);
  state.pizza_name = pizza;
  return state;
}

const VALIDATE_PIZZA_NAME_NODE = "validate_pizza_name";
async function validatePizzaName(state: any) {
  return state;
}

const graph = new StateGraph(AgentState)
  .addNode(ASK_USER_NAME_NODE, askUserName)
  .addNode(GREETING_NODE, greetingNode)
  .addNode(ASK_PIZZA_NAME_NODE, askPizzaName)
  .addNode(VALIDATE_PIZZA_NAME_NODE, validatePizzaName)
  .addConditionalEdges(START, shouldAskUserName)
  .addEdge(ASK_USER_NAME_NODE, GREETING_NODE)
  .addEdge(GREETING_NODE, ASK_PIZZA_NAME_NODE)
  .addConditionalEdges(ASK_PIZZA_NAME_NODE, shouldAskPizzaName)
  .addEdge(VALIDATE_PIZZA_NAME_NODE, END);

const app = graph.compile();

(async () => {
  const result = await app.invoke({ output: [] });
  console.log("Final:", result);
  rl.close();
  process.exit(0);
})();
