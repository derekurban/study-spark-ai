import os
import openai
from dotenv import load_dotenv


class ChatGptHandler:
    def __init__(self, model, temperature=0.7):
        # self.system_role = {"role": "system", "content": "You are a helpful study guide helper designed to answer "
        #                                                  "user queries related to education material"}
        json_schema = {"language": "translation"}
        self.system_role = {"role": "system",
                            "content": "You are a helpful assistant that gives straight forward "
                                       "answers in a json format the json should look like this: "
                                       f"{json_schema}"}

        self.temperature = temperature
        self.model = model
        load_dotenv()
        openai.api_key = os.getenv("PRIVATE_OPENAI_API_KEY")

    def get_from_chat(self, prompt, stream):
        return openai.ChatCompletion.create(
            model=self.model,
            messages=[
                self.system_role,
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=self.temperature,
            stream=stream
        )

    def chat_gpt_response(self, prompt, stream=False):
        if stream:
            for response_messages in self.get_from_chat(prompt, stream):
                print(response_messages)
                if 'content' in response_messages['choices'][0]['delta']:
                    yield f"{response_messages['choices'][0]['delta']['content']}"
                else:
                    yield "\n"
        else:
            print("Stream set to false")
            response_message = self.get_from_chat(prompt, stream)
            print(response_message)
            yield f"{response_message['choices'][0]['message']['content']}\n"
