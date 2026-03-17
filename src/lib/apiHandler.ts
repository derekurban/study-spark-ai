import { writable, type Writable } from 'svelte/store'

async function fetchPost(url: string, body: object) {
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const apiHandler = {
  async chatGpt(gptParams: {
    model?: 'gpt-3.5-turbo' | 'gpt-4'
    temp?: number,
    systemMessage?: string,
    messages: Array<GPTMessage>
    onStart?: () => void
    onChunk: (chunk: string) => void
    onEnd?: (error?: string) => void
  }): Promise<void> {
    const { model, messages, systemMessage, temp, onStart, onChunk, onEnd } = gptParams
    const defaultSystemMsg: GPTMessage = {
      role: 'system',
      content: 'You are a helpful assistant.',
    }

    const index = messages.findIndex((m) => m.role === 'system')
    if (index >= 0) messages.splice(index, 1)
    if (systemMessage)
      messages.splice(0, 0, { role: 'system', content: systemMessage })
    else
      messages.splice(0, 0, defaultSystemMsg)

    try {
      const response = await fetchPost('/api/gpt', {
        model: model ?? 'gpt-3.5-turbo',
        messages: messages,
        temp: temp ?? 0.5
      })

      if (!response.ok || !response.body) return

      const reader = response.body.getReader()
      const textDecoder = new TextDecoder()
      if (onStart) onStart()

      let readResult = await reader.read()

      while (!readResult.done) {

        try {
          onChunk(textDecoder.decode(readResult.value));
          readResult = await reader.read();
        }
        catch (err) {
          console.error(err)
        }
      }

      if (onEnd) onEnd()
    } catch (error) {
      if (onEnd) onEnd(`${error}`)
    }
  },
}

export default apiHandler
