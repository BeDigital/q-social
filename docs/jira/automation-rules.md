# Q-Social JIRA Automation Rules

## Issue Management Automation

### 1. Sprint Assignment Rules

#### Auto-assign High Priority Issues
```yaml
name: Auto-assign high priority issues to current sprint
trigger: issue_created OR issue_updated
conditions:
  - field: priority
    operator: equals
    value: Highest
  - field: status
    operator: equals
    value: Backlog
actions:
  - add_to_sprint: current
  - add_comment: "This high priority issue has been automatically added to the current sprint."
  - notify: project_lead
```

#### Auto-assign Dependent Issues
```yaml
name: Auto-assign dependent issues when parent is in sprint
trigger: issue_updated
conditions:
  - field: sprint
    operator: changed
  - field: issue_type
    operator: equals
    value: Story
actions:
  - jql_search: "issue in linkedIssues('${issue.key}', 'depends on')"
  - for_each_issue:
      - add_to_sprint: ${issue.sprint}
      - add_comment: "Added to sprint ${issue.sprint.name} because it depends on ${issue.key}"
```

#### Auto-assign Subtasks
```yaml
name: Auto-assign subtasks to parent's sprint
trigger: issue_created
conditions:
  - field: issue_type
    operator: equals
    value: Sub-task
  - field: parent
    operator: is_not_empty
actions:
  - add_to_sprint: ${parent.sprint}
  - assign_to: ${parent.assignee}
  - add_label: auto-assigned
```

### 2. Status Transition Rules

#### Update Status on PR Creation
```yaml
name: Update status when PR is created
trigger: pull_request_created
conditions:
  - field: issue_key
    operator: is_not_empty
actions:
  - transition_issue: In Review
  - add_comment: "PR created: ${pullRequest.url}"
  - add_label: in-review
```

#### Update Status on PR Merge
```yaml
name: Update status when PR is merged
trigger: pull_request_merged
conditions:
  - field: issue_key
    operator: is_not_empty
actions:
  - transition_issue: Ready for QA
  - add_comment: "PR merged: ${pullRequest.url}"
  - remove_label: in-review
  - add_label: ready-for-qa
```

#### Auto Close Resolved Issues
```yaml
name: Auto close resolved issues after deployment
trigger: deployment_successful
conditions:
  - field: status
    operator: equals
    value: Ready for QA
  - field: environment
    operator: equals
    value: production
actions:
  - transition_issue: Done
  - add_comment: "Automatically closed after successful deployment to production."
  - notify: issue_reporter
```

### 3. Issue Linking Rules

#### Auto-link Related Issues
```yaml
name: Auto-link related issues based on content
trigger: issue_created OR issue_updated
conditions:
  - field: description
    operator: contains
    value: "QSOC-"
actions:
  - extract_jql_keys: description
  - for_each_issue:
      - link_issues:
          from_issue: ${issue.key}
          to_issue: ${extracted.key}
          link_type: "relates to"
      - add_comment: "Automatically linked to ${extracted.key} based on issue description."
```

#### Auto-link PR to Issues
```yaml
name: Auto-link PR to mentioned issues
trigger: pull_request_created
conditions:
  - field: pull_request_title
    operator: matches
    value: "QSOC-\\d+"
actions:
  - extract_jql_keys: pull_request_title
  - for_each_issue:
      - link_issues:
          from_issue: ${extracted.key}
          to_issue: ${issue.key}
          link_type: "implemented by"
      - add_comment: "Linked to PR: ${pullRequest.url}"
```

### 4. Notification Rules

#### SLA Breach Warning
```yaml
name: SLA breach warning
trigger: scheduled
schedule: daily at 9:00 AM
conditions:
  - jql: "project = QSOC AND status != Done AND priority in (Highest, High) AND created < -5d"
actions:
  - for_each_issue:
      - add_comment: "⚠️ This high priority issue has been open for more than 5 days."
      - notify: assignee
      - notify: project_lead
```

#### Stale PR Notification
```yaml
name: Stale PR notification
trigger: scheduled
schedule: daily at 10:00 AM
conditions:
  - jql: "project = QSOC AND status = 'In Review' AND updated < -3d"
actions:
  - for_each_issue:
      - add_comment: "⚠️ This PR has been in review for more than 3 days without updates."
      - notify: assignee
      - notify: reviewers
```

#### Sprint Goal Progress
```yaml
name: Sprint goal progress notification
trigger: scheduled
schedule: daily at 4:00 PM
actions:
  - calculate_sprint_metrics: current
  - if:
      condition: ${sprint.percentComplete} < 50 AND ${sprint.daysRemaining} < ${sprint.totalDays} / 2
      then:
        - notify: team
        - message: "Sprint is ${sprint.percentComplete}% complete with ${sprint.daysRemaining} days remaining. We may need to adjust scope."
```

### 5. Quality Assurance Rules

#### Auto-assign QA Tasks
```yaml
name: Auto-assign QA tasks when story is ready for testing
trigger: issue_transitioned
conditions:
  - field: status
    operator: changed_to
    value: Ready for QA
actions:
  - create_issue:
      type: Sub-task
      summary: "QA: Test ${issue.summary}"
      description: "Verify that ${issue.summary} meets all acceptance criteria:\n\n${issue.acceptanceCriteria}"
      assignee: ${project.qaLead}
      parent: ${issue.key}
  - add_label: qa-needed
```

#### Auto-create Bug Subtasks
```yaml
name: Create subtasks for bugs
trigger: issue_created
conditions:
  - field: issue_type
    operator: equals
    value: Bug
  - field: priority
    operator: in
    value: [Highest, High]
actions:
  - create_issue:
      type: Sub-task
      summary: "Investigate: ${issue.summary}"
      description: "Investigate root cause of: ${issue.description}"
      assignee: ${issue.assignee}
      parent: ${issue.key}
  - create_issue:
      type: Sub-task
      summary: "Fix: ${issue.summary}"
      description: "Implement fix for: ${issue.description}"
      assignee: ${issue.assignee}
      parent: ${issue.key}
  - create_issue:
      type: Sub-task
      summary: "Test: ${issue.summary}"
      description: "Verify fix for: ${issue.description}"
      assignee: ${project.qaLead}
      parent: ${issue.key}
```

### 6. Reporting Rules

#### Weekly Status Report
```yaml
name: Generate weekly status report
trigger: scheduled
schedule: every Monday at 8:00 AM
actions:
  - calculate_metrics:
      completed_issues: "project = QSOC AND status = Done AND resolved >= -7d"
      open_bugs: "project = QSOC AND issuetype = Bug AND status != Done"
      upcoming_deadlines: "project = QSOC AND duedate >= now() AND duedate <= 7d"
  - create_issue:
      type: Status Report
      summary: "Weekly Status Report: ${date.format('YYYY-MM-dd')}"
      description: |
        # Weekly Status Report
        
        ## Completed Last Week
        ${completed_issues.count} issues completed
        
        ## Open Bugs
        ${open_bugs.count} bugs open
        
        ## Upcoming Deadlines
        ${upcoming_deadlines.count} deadlines in the next 7 days
        
        ## Sprint Progress
        ${sprint.name}: ${sprint.percentComplete}% complete
        
        ## Blockers
        ${blockers.count} blockers identified
      assignee: ${project.lead}
  - notify: stakeholders
```

#### Sprint Burndown Alert
```yaml
name: Sprint burndown alert
trigger: scheduled
schedule: daily at 3:00 PM
actions:
  - calculate_sprint_metrics: current
  - if:
      condition: ${sprint.idealBurndown} - ${sprint.actualBurndown} > ${sprint.totalPoints} * 0.2
      then:
        - notify: scrum_master
        - message: "⚠️ Sprint burndown is deviating from ideal by more than 20%. Current completion: ${sprint.percentComplete}%"
```

## Advanced Automation Scenarios

### 1. Release Management

#### Auto-create Release Notes
```yaml
name: Auto-create release notes
trigger: version_released
conditions:
  - field: version
    operator: is_not_empty
actions:
  - jql_search: "project = QSOC AND fixVersion = ${version.name} AND status = Done"
  - create_page:
      space: RELEASES
      title: "Release Notes: ${version.name}"
      content: |
        # Release Notes: ${version.name}
        
        Released on: ${date.format('YYYY-MM-dd')}
        
        ## New Features
        {{for issue in issues where issue.type == 'Story' and issue.labels contains 'feature'}}
        - ${issue.summary} (${issue.key})
        {{end}}
        
        ## Bug Fixes
        {{for issue in issues where issue.type == 'Bug'}}
        - ${issue.summary} (${issue.key})
        {{end}}
        
        ## Improvements
        {{for issue in issues where issue.labels contains 'improvement'}}
        - ${issue.summary} (${issue.key})
        {{end}}
  - notify: stakeholders
```

### 2. DevOps Integration

#### Trigger Deployment on Issue Transition
```yaml
name: Trigger deployment when issues are ready
trigger: issue_transitioned
conditions:
  - field: status
    operator: changed_to
    value: Ready for Deployment
  - field: labels
    operator: contains
    value: deploy-to-staging
actions:
  - webhook:
      url: ${deployment.webhook}
      method: POST
      body: |
        {
          "version": "${issue.fixVersion}",
          "environment": "staging",
          "issueKey": "${issue.key}"
        }
  - add_comment: "Deployment to staging triggered."
  - transition_issue: Deploying
```

### 3. Team Workload Management

#### Workload Balancing
```yaml
name: Balance team workload
trigger: issue_created
conditions:
  - field: issue_type
    operator: equals
    value: Story
  - field: assignee
    operator: is_empty
actions:
  - calculate_team_workload: "project = QSOC AND sprint = ${current_sprint} AND assignee is not EMPTY"
  - assign_to: ${team.leastAssigned}
  - add_comment: "Automatically assigned to ${team.leastAssigned} based on current workload."
```

#### Auto-adjust Story Points
```yaml
name: Suggest story points based on similar issues
trigger: issue_created
conditions:
  - field: issue_type
    operator: equals
    value: Story
  - field: story_points
    operator: is_empty
actions:
  - find_similar_issues: "project = QSOC AND issuetype = Story AND labels = ${issue.labels} AND story_points is not EMPTY ORDER BY created DESC"
  - calculate_average: story_points from ${similar_issues} limit 5
  - add_comment: "Suggested story points: ${average} based on similar issues: ${similar_issues.keys}"
```
