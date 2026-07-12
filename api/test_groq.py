import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

response = client.chat.completions.create(
    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    messages=[
        {
            "role": "user",
            "content": "Explain Kubernetes CrashLoopBackOff in one paragraph."
        }
    ],
    temperature=0.2,
)

print(response.choices[0].message.content)