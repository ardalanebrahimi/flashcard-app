# Workspace AI Coding Instructions

## File Size & Structure

-   Do not generate large files. Avoid files larger than 300 lines of code.
-   Split logic, UI, and types/interfaces into separate files.
-   Favor modularity: break features into reusable components or services.

## Coding Practices

-   Use TypeScript strictly, separating concerns cleanly.
-   Prefer composition and reusability over duplication.
-   Avoid mixing unrelated responsibilities in the same file.

## Agent Behavior

-   Never run, test, or debug the code automatically. I will handle execution myself.
-   If you finish a task and think a related file or update is needed, always ask before doing it.
-   When I give a prompt, analyze and ask clarification questions if anything is ambiguous.
-   Do not make assumptions or invent missing requirements — always confirm with me first.

## Defaults

-   Assume I want to stay in control of the development process.
-   Favor clean code and maintainability over shortcut solutions.
