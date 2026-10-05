import re
with open(r'Nexus_841_-\src\components\nexus-ui.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Copilot to the nav links
content = content.replace('{ to: "/investigation", label: "INVESTIGATION" },', '{ to: "/investigation", label: "INVESTIGATION" },\n    { to: "/copilot", label: "AI COPILOT" },')

with open(r'Nexus_841_-\src\components\nexus-ui.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
