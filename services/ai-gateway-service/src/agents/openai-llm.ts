import { BaseLlm } from '@google/adk';
import type { LlmRequest, LlmResponse } from '@google/adk';
import { FinishReason } from '@google/genai';

export class OpenAILLM extends BaseLlm {
  static readonly supportedModels = [
    /gpt-.*/,
  ];

  constructor(params: { model: string }) {
    super(params);
  }

  async *generateContentAsync(llmRequest: LlmRequest, stream?: boolean): AsyncGenerator<LlmResponse, void> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
    }

    const messages: any[] = [];

    // 1. Add system instruction if present
    if (llmRequest.config?.systemInstruction) {
      messages.push({
        role: 'system',
        content: llmRequest.config.systemInstruction,
      });
    }

    // 2. Convert history (contents) to OpenAI messages structure
    for (const content of llmRequest.contents) {
      const parts = content.parts || [];
      const role = content.role === 'model' ? 'assistant' : 'user';

      let textContent = '';
      const toolCalls: any[] = [];

      for (const part of parts) {
        if ('text' in part && part.text) {
          textContent += part.text;
        }
        if ('functionCall' in part && part.functionCall) {
          const fc = part.functionCall;
          toolCalls.push({
            id: fc.id || `call_${Math.random().toString(36).substring(2, 11)}`,
            type: 'function',
            function: {
              name: fc.name,
              arguments: typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args || {}),
            },
          });
        }
        if ('functionResponse' in part && part.functionResponse) {
          const fr = part.functionResponse;
          messages.push({
            role: 'tool',
            tool_call_id: fr.id,
            name: fr.name,
            content: typeof fr.response === 'string' ? fr.response : JSON.stringify(fr.response),
          });
        }
      }

      if (role === 'assistant') {
        if (toolCalls.length > 0) {
          messages.push({
            role: 'assistant',
            content: textContent || null,
            tool_calls: toolCalls,
          });
        } else if (textContent) {
          messages.push({
            role: 'assistant',
            content: textContent,
          });
        }
      } else {
        // user turn: if there was text content, push it as a user message
        if (textContent) {
          messages.push({
            role: 'user',
            content: textContent,
          });
        }
      }
    }

    // 3. Map tools if present
    let tools: any[] | undefined = undefined;
    if (llmRequest.config?.tools) {
      tools = [];
      for (const toolGroup of llmRequest.config.tools as any[]) {
        if (toolGroup.functionDeclarations) {
          for (const decl of toolGroup.functionDeclarations) {
            tools.push({
              type: 'function',
              function: {
                name: decl.name,
                description: decl.description,
                parameters: decl.parameters || { type: 'object', properties: {} },
              },
            });
          }
        }
      }
    }

    // 4. Map response format (JSON) if expected
    let responseFormat: any = undefined;
    if (llmRequest.config?.responseMimeType === 'application/json') {
      responseFormat = { type: 'json_object' };
    }

    const requestBody = {
      model: this.model,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      response_format: responseFormat,
      stream: stream || false,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    if (stream) {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable.');
      }
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || cleanLine === 'data: [DONE]') continue;
          if (cleanLine.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(cleanLine.slice(6));
              const choice = chunk.choices?.[0];
              if (choice) {
                const delta = choice.delta;
                const parts: any[] = [];
                if (delta.content) {
                  parts.push({ text: delta.content });
                }
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    parts.push({
                      functionCall: {
                        id: tc.id,
                        name: tc.function?.name,
                        args: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
                      },
                    });
                  }
                }
                yield {
                  content: {
                    role: 'model',
                    parts,
                  },
                  partial: true,
                };
              }
            } catch (err) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } else {
      const result = await response.json();
      const choice = result.choices?.[0];
      if (!choice) {
        throw new Error('No choice returned from OpenAI.');
      }

      const message = choice.message;
      const parts: any[] = [];

      if (message.content) {
        parts.push({ text: message.content });
      }

      if (message.tool_calls) {
        for (const tc of message.tool_calls) {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments || '{}');
          } catch (e) {
            console.error('Failed to parse tool call arguments:', tc.function.arguments);
          }
          parts.push({
            functionCall: {
              id: tc.id,
              name: tc.function.name,
              args: parsedArgs,
            },
          });
        }
      }

      const llmResponse: LlmResponse = {
        content: {
          role: 'model',
          parts,
        },
      };

      if (choice.finish_reason === 'stop') {
        llmResponse.finishReason = FinishReason.STOP;
      }

      if (result.usage) {
        llmResponse.usageMetadata = {
          promptTokenCount: result.usage.prompt_tokens,
          candidatesTokenCount: result.usage.completion_tokens,
          totalTokenCount: result.usage.total_tokens,
        };
      }

      yield llmResponse;
    }
  }

  async connect(llmRequest: LlmRequest): Promise<any> {
    throw new Error('Websocket/Live connection not supported for OpenAI.');
  }
}
