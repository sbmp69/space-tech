with open(r'Nexus_841_-\src\routes\copilot.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

header = """import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/copilot')({
  component: Copilot,
})

"""

content = content.replace("export function Copilot() {", "function Copilot() {")

with open(r'Nexus_841_-\src\routes\copilot.tsx', 'w', encoding='utf-8') as f:
    f.write(header + content)
