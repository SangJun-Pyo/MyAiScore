# Agent roles

- planner-agent: breaks every request into subtasks
- coder-agent: writes code
- reviewer-agent: reviews coder-agent's output
- deployer-agent: deploys on merge

(This fixture intentionally has an elaborate multi-agent setup on paper, but
no test files, no CI, and no recorded verification step anywhere in the
repo or the collaboration case.)
