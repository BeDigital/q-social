# Spec-Driven Development Methodology

## Overview
This document defines my preferred approach to spec-driven development using Amazon Q Developer. When I request "spec-driven development" for a project, follow this structured methodology.

## Phase 1: Requirements Gathering
When starting spec-driven development:

1. **Initial Requirements Document**
   - Create a comprehensive requirements.md file
   - Include functional and non-functional requirements
   - Define success criteria and constraints
   - Identify target users and use cases

2. **Requirements Refinement**
   - Create a requirements-refinement.md file
   - Break down high-level requirements into specific features
   - Identify dependencies and priorities
   - Define acceptance criteria for each requirement

## Phase 2: User Story Development
3. **User Stories Creation**
   - Generate user-stories.md with detailed user personas
   - Write stories in "As a [user], I want [goal] so that [benefit]" format
   - Include acceptance criteria for each story
   - Prioritize stories by business value and technical complexity

## Phase 3: Technical Specifications
4. **Architecture Design**
   - Create technical-architecture.md with system design
   - Define component interactions and data flow
   - Specify technology stack and infrastructure requirements
   - Include security and scalability considerations

5. **Implementation Tasks**
   - Generate tasks.md with specific development tasks
   - Break down user stories into actionable development work
   - Include estimates and dependencies
   - Define completion criteria for each task

## File Structure Standards
When creating spec-driven projects, organize files as:
```
project-name/
├── specs/
│   ├── requirements.md
│   ├── requirements-refinement.md
│   ├── user-stories.md
│   ├── technical-architecture.md
│   └── tasks.md
├── src/
└── tests/
```

## Documentation Standards
- Use clear, concise language in all specifications
- Include examples and use cases where helpful
- Maintain consistency in formatting and structure
- Update specifications as requirements evolve
- Link related documents and reference dependencies

## Development Workflow
1. Always start with requirements gathering before coding
2. Validate specifications with stakeholders before implementation
3. Use specifications to guide all development decisions
4. Update documentation as the project evolves
5. Reference specifications when debugging or adding features

## Quality Criteria
Specifications should be:
- **Complete**: Cover all functional and non-functional requirements
- **Consistent**: Use consistent terminology and patterns
- **Testable**: Include criteria that can be validated
- **Maintainable**: Easy to update as requirements change
- **Accessible**: Clear to both technical and non-technical stakeholders

## Implementation Guide

### 1. Requirements Phase
```markdown
# requirements.md template
## Project Overview
[High-level description of the project]

## Functional Requirements
1. [Requirement category]
   - Specific requirement
   - Success criteria
   - Constraints

## Non-Functional Requirements
1. Performance
2. Security
3. Scalability
4. Maintainability

## Target Users
- User type 1
  - Characteristics
  - Needs
  - Use cases
```

### 2. Requirements Refinement
```markdown
# requirements-refinement.md template
## Feature Breakdown
1. [Feature Name]
   - Detailed description
   - Dependencies
   - Priority level
   - Acceptance criteria

## Technical Constraints
- List of technical limitations
- Integration requirements
- Performance targets
```

### 3. User Stories
```markdown
# user-stories.md template
## User Personas
1. [Persona Name]
   - Demographics
   - Goals
   - Pain points

## Stories
1. Story ID: [ID]
   As a [user type]
   I want [goal]
   So that [benefit]
   
   Acceptance Criteria:
   - Criterion 1
   - Criterion 2
```

### 4. Technical Architecture
```markdown
# technical-architecture.md template
## System Overview
[Architecture diagram]

## Components
1. [Component Name]
   - Purpose
   - Interactions
   - Data flow
   - Technologies used

## Infrastructure
- Deployment architecture
- Scaling strategy
- Security measures
```

### 5. Implementation Tasks
```markdown
# tasks.md template
## Development Tasks
1. [Task ID]: [Task Name]
   - Description
   - Dependencies
   - Estimate
   - Completion criteria
   - Testing requirements
```

## Validation Checklist
Before proceeding with implementation:

- [ ] All required specification documents are created
- [ ] Requirements are clear and measurable
- [ ] User stories are properly defined
- [ ] Technical architecture is documented
- [ ] Tasks are broken down appropriately
- [ ] Dependencies are identified
- [ ] Testing criteria are established
- [ ] Documentation is reviewed and approved

## Template Usage
To start a new spec-driven project:

1. Create project directory structure
2. Copy template files from spec-driven-template
3. Fill in each document following the templates
4. Review and validate all specifications
5. Begin implementation only after validation

## Maintenance
- Review specifications regularly
- Update documentation as requirements change
- Keep track of deviations from specifications
- Document lessons learned
- Improve templates based on project experience
