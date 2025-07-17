# Q-Social JIRA Workflow Diagrams

## Issue Workflow Diagram

```mermaid
stateDiagram-v2
    [*] --> Backlog
    Backlog --> ToDo: Sprint Planning
    ToDo --> InProgress: Developer Starts Work
    InProgress --> CodeReview: PR Created
    CodeReview --> ReadyForQA: PR Merged
    CodeReview --> InProgress: Changes Requested
    ReadyForQA --> Done: QA Approved
    ReadyForQA --> InProgress: QA Rejected
    Done --> [*]
    
    state Backlog {
        [*] --> Grooming
        Grooming --> Prioritized
        Prioritized --> Ready
        Ready --> [*]: Added to Sprint
    }
    
    state InProgress {
        [*] --> Implementing
        Implementing --> Testing
        Testing --> [*]: Ready for Review
    }
    
    state CodeReview {
        [*] --> WaitingReview
        WaitingReview --> InReview
        InReview --> ChangesRequested
        InReview --> Approved
        ChangesRequested --> UpdatedPR
        UpdatedPR --> InReview
        Approved --> [*]
    }
    
    state ReadyForQA {
        [*] --> Testing
        Testing --> PassedQA
        Testing --> FailedQA
        PassedQA --> [*]
        FailedQA --> [*]: Return to InProgress
    }
```

## Sprint Workflow Diagram

```mermaid
graph TD
    A[Sprint Planning] -->|Create Sprint| B[Sprint Active]
    B -->|Daily Standup| B
    B -->|Add Issues| B
    B -->|Update Status| B
    B -->|Sprint End| C[Sprint Review]
    C --> D[Sprint Retrospective]
    D --> E[Backlog Grooming]
    E --> A
    
    subgraph "Sprint Ceremonies"
    A
    B
    C
    D
    E
    end
    
    F[Product Backlog] -->|Prioritize| E
    E -->|Refine| F
    F -->|Select Issues| A
    A -->|Plan Sprint| B
```

## Issue Lifecycle Diagram

```mermaid
flowchart TD
    A[Issue Created] --> B{Issue Type?}
    B -->|Story| C[Backlog Grooming]
    B -->|Bug| D[Triage]
    B -->|Task| E[Prioritize]
    
    C --> F[Sprint Planning]
    D --> G{Priority?}
    G -->|High| F
    G -->|Medium/Low| C
    E --> F
    
    F --> H[To Do]
    H --> I[In Progress]
    I --> J[Code Review]
    J --> K{Approved?}
    K -->|Yes| L[Ready for QA]
    K -->|No| I
    
    L --> M{Passes QA?}
    M -->|Yes| N[Done]
    M -->|No| I
    
    N --> O[Release]
    O --> P[Closed]
    
    style A fill:#d4f1f9
    style N fill:#c1e1c1
    style P fill:#c1e1c1
    style D fill:#ffe6cc
    style G fill:#ffe6cc
```

## Automation Rules Flow

```mermaid
flowchart LR
    A[Trigger Event] --> B{Conditions Met?}
    B -->|Yes| C[Execute Actions]
    B -->|No| D[End]
    
    subgraph "Triggers"
    A1[Issue Created]
    A2[Issue Updated]
    A3[Status Changed]
    A4[PR Created]
    A5[Scheduled]
    end
    
    subgraph "Conditions"
    B1[Field Value]
    B2[JQL Query]
    B3[User Role]
    B4[Time Condition]
    end
    
    subgraph "Actions"
    C1[Update Issue]
    C2[Transition Status]
    C3[Add Comment]
    C4[Notify Users]
    C5[Create Related Issues]
    end
    
    A1 --> A
    A2 --> A
    A3 --> A
    A4 --> A
    A5 --> A
    
    B --> B1
    B --> B2
    B --> B3
    B --> B4
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    C --> C5
```

## Sprint Burndown Chart

```mermaid
gantt
    title Sprint Burndown
    dateFormat  YYYY-MM-DD
    axisFormat %d
    
    section Ideal Burndown
    34 points     :done, des1, 2023-07-01, 2023-07-14
    
    section Actual Burndown
    Day 1 (34 points)     :active, des2, 2023-07-01, 1d
    Day 2 (32 points)     :des3, after des2, 1d
    Day 3 (28 points)     :des4, after des3, 1d
    Day 4 (28 points)     :des5, after des4, 1d
    Day 5 (25 points)     :des6, after des5, 1d
    Day 6 (20 points)     :des7, after des6, 1d
    Day 7 (20 points)     :des8, after des7, 1d
    Day 8 (15 points)     :des9, after des8, 1d
    Day 9 (12 points)     :des10, after des9, 1d
    Day 10 (8 points)     :des11, after des10, 1d
    Day 11 (5 points)     :des12, after des11, 1d
    Day 12 (3 points)     :des13, after des12, 1d
    Day 13 (1 point)      :des14, after des13, 1d
    Day 14 (0 points)     :des15, after des14, 1d
```

## Epic Relationship Diagram

```mermaid
graph TD
    A[QSOC-1: Authentication & User Management] --> B[QSOC-2: Post Management & Content]
    A --> C[QSOC-3: Social Interaction Features]
    D[QSOC-4: Infrastructure & DevOps] --> A
    D --> B
    D --> C
    D --> E[QSOC-5: Search & Discovery]
    B --> E
    C --> E
    
    subgraph "Sprint 1"
    D1[QSOC-101: AWS Infrastructure]
    D2[QSOC-102: Basic Authentication]
    D3[QSOC-103: Database Setup]
    D4[QSOC-104: CI/CD Pipeline]
    end
    
    subgraph "Sprint 2"
    A1[QSOC-201: User Profiles]
    A2[QSOC-202: Social Authentication]
    A3[QSOC-203: Two-Factor Authentication]
    A4[QSOC-204: Security Enhancements]
    end
    
    D --> D1
    D --> D3
    D --> D4
    A --> D2
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    
    style A fill:#d0e0ff
    style B fill:#d0ffe0
    style C fill:#ffe0d0
    style D fill:#e0d0ff
    style E fill:#fff0d0
```

## Team Velocity Chart

```mermaid
xychart-beta
    title "Team Velocity Over Sprints"
    x-axis [1, 2, 3, 4, 5, 6, 7, 8]
    y-axis "Story Points" 0 --> 50
    bar [25, 28, 30, 34, 36, 38, 40, 42]
    line [34, 34, 34, 34, 34, 34, 34, 34]
    
    title-color: #333
    x-axis-color: #333
    y-axis-color: #333
    stroke-color: #f00
    stroke-width: 2
    grid-color: #ccc
```

## Release Planning Timeline

```mermaid
gantt
    title Q-Social Release Timeline
    dateFormat  YYYY-MM-DD
    axisFormat %b %d
    
    section Foundation
    Sprint 1: active, s1, 2023-07-01, 14d
    
    section User Management
    Sprint 2: s2, after s1, 14d
    
    section Content Management
    Sprint 3: s3, after s2, 14d
    
    section Social Features
    Sprint 4: s4, after s3, 14d
    
    section Search & Discovery
    Sprint 5: s5, after s4, 14d
    
    section Releases
    Alpha Release: milestone, m1, 2023-07-21, 0d
    Beta Release: milestone, m2, 2023-08-18, 0d
    RC Release: milestone, m3, 2023-09-15, 0d
    v1.0 Release: milestone, m4, 2023-09-29, 0d
```

## Issue Type Workflow Variations

```mermaid
stateDiagram-v2
    [*] --> Backlog
    
    state "Story Workflow" as SW {
        Backlog --> ToDo
        ToDo --> InProgress
        InProgress --> CodeReview
        CodeReview --> ReadyForQA
        ReadyForQA --> Done
    }
    
    state "Bug Workflow" as BW {
        Backlog --> Triage
        Triage --> ToDo
        ToDo --> InProgress
        InProgress --> CodeReview
        CodeReview --> ReadyForQA
        ReadyForQA --> Verified
        Verified --> Done
    }
    
    state "Task Workflow" as TW {
        Backlog --> ToDo
        ToDo --> InProgress
        InProgress --> Done
    }
    
    Done --> [*]
```

## JIRA Board Layout

```mermaid
flowchart TD
    subgraph "Q-Social Development Board"
    direction LR
    
    subgraph "Backlog"
    B1[Stories]
    B2[Bugs]
    B3[Tasks]
    end
    
    subgraph "To Do"
    T1[High Priority]
    T2[Medium Priority]
    T3[Low Priority]
    end
    
    subgraph "In Progress"
    I1[Frontend]
    I2[Backend]
    I3[DevOps]
    end
    
    subgraph "Code Review"
    C1[Waiting Review]
    C2[Changes Requested]
    end
    
    subgraph "QA"
    Q1[Testing]
    Q2[Blocked]
    end
    
    subgraph "Done"
    D1[Completed]
    end
    
    B1 --> T1
    B2 --> T1
    B3 --> T2
    T1 --> I1
    T1 --> I2
    T1 --> I3
    I1 --> C1
    I2 --> C1
    I3 --> C1
    C1 --> Q1
    Q1 --> D1
    end
```

## Automation Integration Map

```mermaid
graph TD
    A[JIRA] --> B[GitHub]
    A --> C[Slack]
    A --> D[CI/CD Pipeline]
    A --> E[AWS Services]
    
    B --> B1[PR Creation]
    B --> B2[Code Review]
    B --> B3[Merge Events]
    
    C --> C1[Notifications]
    C --> C2[Daily Reports]
    C --> C3[Approvals]
    
    D --> D1[Build Triggers]
    D --> D2[Deployment Events]
    D --> D3[Test Results]
    
    E --> E1[Infrastructure Status]
    E --> E2[Monitoring Alerts]
    E --> E3[Cost Reports]
    
    B1 --> A1[Update Issue Status]
    B2 --> A2[Add Comments]
    B3 --> A3[Transition Issues]
    
    C1 --> A4[Team Notifications]
    D3 --> A5[QA Status Updates]
    E2 --> A6[Create Incident Issues]
    
    style A fill:#d4f1f9,stroke:#333,stroke-width:2px
    style B fill:#d0e0ff,stroke:#333,stroke-width:1px
    style C fill:#d0ffe0,stroke:#333,stroke-width:1px
    style D fill:#ffe0d0,stroke:#333,stroke-width:1px
    style E fill:#e0d0ff,stroke:#333,stroke-width:1px
```
