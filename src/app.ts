import { START, END, StateGraph, Annotation } from "@langchain/langgraph";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

type PizzaId = number;
type PizzaName = string;
type PizzaAmount = number;
const AgentState = Annotation.Root({
  user_name: Annotation<string | undefined>(),
  current_pizza_name: Annotation<PizzaName | undefined>(),
  pizzas: Annotation<Map<PizzaName, PizzaAmount>>(),
  output: Annotation<string[]>(),
});

const ASK_USER_NAME_NODE = "ask_user_name";
async function askUserName(state: typeof AgentState.State) {
  const name = await rl.question("ChatBot: What's your name?\n");
  console.info("Received:", name);
  state.user_name = name;
  return state;
}

function shouldAskUserName(state: typeof AgentState.State) {
  return state.user_name ? GREETING_NODE : ASK_USER_NAME_NODE;
}

const GREETING_NODE = "greeting";
async function greetingNode(state: typeof AgentState.State) {
  state.output.push(`Hello, ${state.user_name}!`);
  return state;
}

interface PizzaData {
  id: number;
  name: String;
}
async function shouldValidatePizza(state: typeof AgentState.State) {
  const getPizzasRes = await fetch(
    "https://demos.swe.htwk-leipzig.de/pizza-api/pizza",
  );
  if (!getPizzasRes.ok) {
    throw new Error(`Request failed with status ${getPizzasRes.status}`);
  }

  const valid_pizzas: PizzaData[] = (await getPizzasRes.json()) as PizzaData[];
  if (!state.current_pizza_name) {
    return ASK_PIZZA_NAME_NODE;
  } else {
    let valid_pizza = valid_pizzas.find(
      (pizza) => pizza.name == state.current_pizza_name,
    );
    if (valid_pizza) {
      return ASK_PIZZA_AMOUNT_NODE;
    } else {
      let valid_pizza_names = valid_pizzas.map((pizza) => pizza.name);
      console.info(
        `Pizza '${state.current_pizza_name}' is invalid. Try any of: '${valid_pizza_names}'`,
      );
      return ASK_PIZZA_NAME_NODE;
    }
  }
}

const ASK_PIZZA_NAME_NODE = "ask_pizza_name";
async function askPizzaName(state: typeof AgentState.State) {
  const pizza = await rl.question(
    "ChatBot: What pizza do you want to order?\n",
  );
  console.info("Received:", pizza);
  state.current_pizza_name = pizza;
  return state;
}

const ASK_PIZZA_AMOUNT_NODE = "ask_pizza_amount";
async function askPizzaAmount(state: typeof AgentState.State) {
  const amount = await rl.question(
    `ChatBot: How many Pizza '${state.current_pizza_name}' do you want to order?\n`,
  );
  console.info("Received:", amount);
  state.pizzas.set(state.current_pizza_name!, Number.parseInt(amount));
  return state;
}

const graph = new StateGraph(AgentState)
  .addNode(ASK_USER_NAME_NODE, askUserName)
  .addNode(GREETING_NODE, greetingNode)
  .addNode(ASK_PIZZA_NAME_NODE, askPizzaName)
  .addNode(ASK_PIZZA_AMOUNT_NODE, askPizzaAmount)
  .addConditionalEdges(START, shouldAskUserName)
  .addEdge(ASK_USER_NAME_NODE, GREETING_NODE)
  .addEdge(GREETING_NODE, ASK_PIZZA_NAME_NODE)
  .addConditionalEdges(ASK_PIZZA_NAME_NODE, shouldValidatePizza)
  .addEdge(ASK_PIZZA_AMOUNT_NODE, END);

const app = graph.compile();

(async () => {
  const result = await app.invoke({
    output: [],
    pizzas: new Map<PizzaId, PizzaAmount>(),
  });
  console.log("Final:", result);
  rl.close();
  process.exit(0);
})();
