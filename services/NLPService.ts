import { Configuration, OpenAIApi } from "openai";

export interface NLPService {
  getGraphQLQueryFromText({
    query,
    graphQLSchema,
  }: {
    query: string;
    graphQLSchema?: string;
  }): Promise<string>;
}

class MockNLPService implements NLPService {
  async getGraphQLQueryFromText({ query }: { query: string }): Promise<string> {
    return Promise.resolve(
      '{orders(grain: "year") {customer_id\nperiod\norders}}'
    );
  }
}

class OpenAIService implements NLPService {
  private client: OpenAIApi;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("No OpenAI API key provided");
    }
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.client = new OpenAIApi(configuration);
  }

  async getGraphQLQueryFromText({
    query,
    graphQLSchema,
  }: {
    query: string;
    graphQLSchema: string;
  }): Promise<string> {
    console.debug(`Getting graphQL query`);
    const response = await this.client.createCompletion("code-davinci-002", {
      prompt:
        "const schema = gql`" +
        graphQLSchema +
        "`\n\n/* don't fill in start_date and end_date */\n/* generates a query using `schema` to tell me: " +
        query +
        " */\nconst generateQuery: string = () => {\n  return gql`\n    ",
      suffix: "\n  `\n}",
      temperature: 0,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    if (!response.data.choices) {
      throw new Error("Invalid request; no choices received from OpenAI");
    }
    const [{ text: graphQLQuery }] = response.data.choices;
    console.debug(`GraphQL query finished`, { graphQLQuery });
    if (!graphQLQuery) {
      throw new Error("Invalid request; no completion received from OpenAI");
    }
    return graphQLQuery;
  }
}

const instance = process.env.OPENAI_API_KEY
  ? new OpenAIService()
  : new MockNLPService();
export default instance;
