import os
import json

from dotenv import load_dotenv
from google import genai
load_dotenv()

client = genai.Client(
    api_key=os.getevn("GENAI_API_KEY")
)

def analyze_incident(incident):
    
    prompt = f"""
    you are an expert kubernetes SRE
    
    analyze this kubernetes incident
    
    incident: {json.dumps(incident, indent=2)}
    
    return:
    1. Root cause
    2. Severity
    3. Explanation
    4. Recommended remediation
    5. Suggested kubectl fix commands
    
    keep response concise and operationally useful
    """
    response = client.model.generate_content(
        model = "gemini-2.5-flash",
        contents=prompt
    )
    return response.text
