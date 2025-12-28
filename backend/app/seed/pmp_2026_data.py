"""
PMP 2026 ECO Seed Data

Seeds the database with:
- 3 Domains (People, Process, Business Environment)
- 26 Tasks across all domains
- 5-10 Flashcards per task
- 3-5 Questions per task

Run with: python -m app.seed.pmp_2026_data
"""

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import Domain, Flashcard, Question, Task
from app.models.domain import Base


def get_pmp_2026_data() -> dict:
    """Return the complete PMP 2026 ECO data structure."""
    return {
        "domains": [
            {
                "name": "People",
                "description": "Leadership, team dynamics, and stakeholder engagement across project environments.",
                "weight": 33.0,
                "order": 1,
                "tasks": [
                    {
                        "name": "Lead the project team",
                        "description": "Set expectations, empower team members, address problems, and adapt leadership style to context.",
                        "order": 1,
                        "flashcards": [
                            {"front": "What is servant leadership?", "back": "A leadership style where the leader prioritizes the needs of team members and helps them develop and perform at their highest potential."},
                            {"front": "What are the key elements of setting team expectations?", "back": "Clear goals, defined roles and responsibilities, performance standards, communication protocols, and decision-making processes."},
                            {"front": "How should a PM adapt leadership style?", "back": "Based on team maturity, project phase, organizational culture, and individual team member needs using situational leadership."},
                            {"front": "What is psychological safety in teams?", "back": "An environment where team members feel safe to take risks, express ideas, ask questions, and admit mistakes without fear of punishment."},
                            {"front": "What are the stages of team development?", "back": "Forming, Storming, Norming, Performing, and Adjourning (Tuckman's model)."},
                        ],
                        "questions": [
                            {"question_text": "A new team member is hesitant to share ideas during meetings. What should the project manager do FIRST?", "option_a": "Assign the team member to lead the next meeting", "option_b": "Create a psychologically safe environment for sharing", "option_c": "Document the behavior in performance reviews", "option_d": "Ask other team members to encourage participation", "correct_answer": "B", "explanation": "Creating psychological safety is fundamental to enabling team members to feel comfortable sharing ideas.", "difficulty": "medium"},
                            {"question_text": "During a project, the team is experiencing conflict about technical approaches. According to Tuckman's model, which stage is the team likely in?", "option_a": "Forming", "option_b": "Storming", "option_c": "Norming", "option_d": "Performing", "correct_answer": "B", "explanation": "The Storming stage is characterized by conflict as team members assert their opinions and work through differences.", "difficulty": "easy"},
                            {"question_text": "A project manager notices that a highly experienced team performs best with minimal oversight. Which leadership style is most appropriate?", "option_a": "Directive", "option_b": "Coaching", "option_c": "Supporting", "option_d": "Delegating", "correct_answer": "D", "explanation": "Delegating style works best for highly competent and committed team members who need minimal supervision.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Help ensure knowledge transfer",
                        "description": "Facilitate sharing of knowledge and lessons learned within and across projects.",
                        "order": 2,
                        "flashcards": [
                            {"front": "What is tacit knowledge?", "back": "Knowledge gained through personal experience that is difficult to articulate or document, such as intuition and skills."},
                            {"front": "What is explicit knowledge?", "back": "Knowledge that can be easily documented, shared, and transferred through written documents, procedures, or databases."},
                            {"front": "What are common knowledge transfer methods?", "back": "Mentoring, pair programming, documentation, wikis, lessons learned sessions, communities of practice, and training sessions."},
                            {"front": "What is a lessons learned register?", "back": "A document that captures knowledge gained during a project, including what worked well and what could be improved for future projects."},
                            {"front": "When should knowledge transfer occur?", "back": "Throughout the project lifecycle, not just at the end - during retrospectives, phase gates, and team transitions."},
                        ],
                        "questions": [
                            {"question_text": "A senior developer is leaving the project. What is the BEST approach to preserve their knowledge?", "option_a": "Ask them to document everything before leaving", "option_b": "Pair them with other developers and conduct knowledge transfer sessions", "option_c": "Record video tutorials of their work", "option_d": "Request they extend their departure date", "correct_answer": "B", "explanation": "Pairing and interactive knowledge transfer sessions are most effective for transferring both tacit and explicit knowledge.", "difficulty": "medium"},
                            {"question_text": "Which type of knowledge is MOST difficult to transfer through documentation alone?", "option_a": "Process procedures", "option_b": "Technical specifications", "option_c": "Tacit knowledge", "option_d": "Organizational policies", "correct_answer": "C", "explanation": "Tacit knowledge is gained through experience and is difficult to articulate, requiring hands-on methods for transfer.", "difficulty": "easy"},
                            {"question_text": "A project manager wants to improve knowledge sharing across multiple agile teams. What approach would be MOST effective?", "option_a": "Create a shared documentation repository", "option_b": "Establish communities of practice", "option_c": "Mandate weekly status reports", "option_d": "Assign a knowledge manager role", "correct_answer": "B", "explanation": "Communities of practice enable organic knowledge sharing and collaboration across teams with similar interests.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Identify and analyze stakeholders",
                        "description": "Identify stakeholders, analyze their interests and influence, and develop engagement strategies.",
                        "order": 3,
                        "flashcards": [
                            {"front": "What is a stakeholder?", "back": "Any individual, group, or organization that can affect, be affected by, or perceive themselves to be affected by the project."},
                            {"front": "What is a power/interest grid?", "back": "A stakeholder analysis tool that maps stakeholders based on their level of authority (power) and their concern (interest) in project outcomes."},
                            {"front": "What information is in a stakeholder register?", "back": "Stakeholder identification, assessment information, and stakeholder classification including contact info, role, expectations, and influence level."},
                            {"front": "What is stakeholder salience?", "back": "A model that classifies stakeholders based on power, legitimacy, and urgency to determine their relative importance."},
                            {"front": "What are the stakeholder engagement levels?", "back": "Unaware, Resistant, Neutral, Supportive, and Leading - used to assess current and desired engagement."},
                        ],
                        "questions": [
                            {"question_text": "A stakeholder has high power but low interest in the project. According to the power/interest grid, how should they be managed?", "option_a": "Manage closely", "option_b": "Keep satisfied", "option_c": "Keep informed", "option_d": "Monitor", "correct_answer": "B", "explanation": "High power/low interest stakeholders should be kept satisfied to prevent them from becoming obstacles.", "difficulty": "easy"},
                            {"question_text": "During stakeholder analysis, the PM discovers a hidden stakeholder who could significantly impact the project. What should be done FIRST?", "option_a": "Add them to the stakeholder register", "option_b": "Inform the project sponsor", "option_c": "Assess their power and interest", "option_d": "Develop an engagement strategy", "correct_answer": "A", "explanation": "First document the stakeholder in the register, then assess and develop strategies.", "difficulty": "medium"},
                            {"question_text": "Which stakeholder engagement level indicates active support and advocacy for the project?", "option_a": "Supportive", "option_b": "Leading", "option_c": "Neutral", "option_d": "Aware", "correct_answer": "B", "explanation": "Leading indicates stakeholders who are actively engaged and advocating for project success.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Tailor communication to stakeholder needs",
                        "description": "Adapt communication methods, frequency, and content to meet diverse stakeholder requirements.",
                        "order": 4,
                        "flashcards": [
                            {"front": "What is a communication management plan?", "back": "A document describing how project communications will be planned, structured, implemented, and monitored."},
                            {"front": "What factors affect communication method selection?", "back": "Stakeholder preferences, urgency, sensitivity, complexity of information, geographic distribution, and organizational culture."},
                            {"front": "What is push communication?", "back": "Information sent to specific recipients who need to know, such as emails, reports, and memos."},
                            {"front": "What is pull communication?", "back": "Information placed in a central location for recipients to access at their discretion, such as websites and knowledge repositories."},
                            {"front": "What is interactive communication?", "back": "Multidirectional exchange of information in real-time, such as meetings, calls, and video conferences."},
                        ],
                        "questions": [
                            {"question_text": "A project has stakeholders across multiple time zones. What communication approach is MOST appropriate for daily updates?", "option_a": "Synchronous video meetings", "option_b": "Asynchronous written updates", "option_c": "Phone calls during business hours", "option_d": "In-person meetings when possible", "correct_answer": "B", "explanation": "Asynchronous communication allows stakeholders to consume information at convenient times across time zones.", "difficulty": "easy"},
                            {"question_text": "An executive stakeholder prefers high-level summaries while the technical team needs detailed information. How should the PM handle reporting?", "option_a": "Create a single comprehensive report for all", "option_b": "Tailor reports to each audience's needs", "option_c": "Only provide detailed reports and let executives skim", "option_d": "Have team leads summarize for executives", "correct_answer": "B", "explanation": "Tailoring communication to audience needs ensures information is relevant and actionable for each stakeholder group.", "difficulty": "medium"},
                            {"question_text": "Which communication method is BEST for discussing sensitive personnel issues?", "option_a": "Email with HR copied", "option_b": "Team meeting discussion", "option_c": "Private face-to-face conversation", "option_d": "Written memo to management", "correct_answer": "C", "explanation": "Sensitive issues require private, interactive communication to handle nuances and maintain confidentiality.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Execute stakeholder engagement plan",
                        "description": "Implement strategies to engage stakeholders effectively throughout the project.",
                        "order": 5,
                        "flashcards": [
                            {"front": "What is a stakeholder engagement plan?", "back": "A component of the project management plan that identifies strategies for engaging stakeholders in project decisions and execution."},
                            {"front": "What is the stakeholder engagement assessment matrix?", "back": "A tool comparing current vs. desired engagement levels for each stakeholder to identify gaps requiring action."},
                            {"front": "How do you handle resistant stakeholders?", "back": "Understand their concerns, address issues directly, find common ground, involve them in decisions, and demonstrate value to their interests."},
                            {"front": "What are engagement activities?", "back": "Meetings, workshops, reviews, presentations, one-on-ones, site visits, and other interactions designed to build relationships and commitment."},
                            {"front": "How is stakeholder engagement monitored?", "back": "Through regular assessment of engagement levels, feedback collection, relationship indicators, and adjustment of strategies as needed."},
                        ],
                        "questions": [
                            {"question_text": "A key stakeholder's engagement has shifted from supportive to neutral. What should the PM do FIRST?", "option_a": "Document the change in the stakeholder register", "option_b": "Investigate the cause of the change", "option_c": "Escalate to the project sponsor", "option_d": "Update the engagement plan", "correct_answer": "B", "explanation": "Understanding why engagement changed is essential before taking corrective action.", "difficulty": "medium"},
                            {"question_text": "The stakeholder engagement assessment matrix shows a gap between current (Neutral) and desired (Supportive) engagement. What does this indicate?", "option_a": "The stakeholder should be removed from the project", "option_b": "Additional engagement activities are needed", "option_c": "The desired level should be adjusted", "option_d": "No action is required", "correct_answer": "B", "explanation": "Gaps between current and desired engagement indicate the need for targeted engagement activities.", "difficulty": "easy"},
                            {"question_text": "How should a PM engage a stakeholder who has high influence but is resistant to the project?", "option_a": "Minimize their involvement in decisions", "option_b": "Work closely to understand and address their concerns", "option_c": "Escalate immediately to senior management", "option_d": "Focus on other supportive stakeholders", "correct_answer": "B", "explanation": "High-influence resistant stakeholders require proactive engagement to convert them to supporters.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Build trust and influence stakeholders",
                        "description": "Develop authentic relationships, demonstrate integrity, and use influence to achieve project objectives.",
                        "order": 6,
                        "flashcards": [
                            {"front": "What are the foundations of trust in project management?", "back": "Competence, integrity, consistency, reliability, transparency, and genuine concern for stakeholder interests."},
                            {"front": "What is emotional intelligence (EQ)?", "back": "The ability to recognize, understand, and manage your own emotions and those of others - critical for building relationships."},
                            {"front": "What are influence techniques?", "back": "Persuasion, negotiation, coalition building, leveraging expertise, building relationships, and using data/evidence."},
                            {"front": "What is the difference between authority and influence?", "back": "Authority is formal power from position; influence is the ability to affect behavior without formal authority through relationships and credibility."},
                            {"front": "How do you rebuild trust after it's broken?", "back": "Acknowledge the issue, take responsibility, communicate openly, follow through on commitments, and demonstrate changed behavior over time."},
                        ],
                        "questions": [
                            {"question_text": "A PM needs to influence a functional manager to release resources without having direct authority. What approach is MOST effective?", "option_a": "Escalate to the project sponsor", "option_b": "Build a relationship and demonstrate mutual benefits", "option_c": "Document the need formally and submit a request", "option_d": "Offer to trade resources from other projects", "correct_answer": "B", "explanation": "Building relationships and showing mutual benefit is the most sustainable influence approach.", "difficulty": "medium"},
                            {"question_text": "Which component of emotional intelligence involves understanding others' perspectives and feelings?", "option_a": "Self-awareness", "option_b": "Self-regulation", "option_c": "Empathy", "option_d": "Social skills", "correct_answer": "C", "explanation": "Empathy is the ability to understand and share the feelings of others.", "difficulty": "easy"},
                            {"question_text": "Trust has been damaged after the PM missed a critical deadline. What should be done FIRST?", "option_a": "Create a recovery plan for the schedule", "option_b": "Acknowledge the failure and take responsibility", "option_c": "Identify who else contributed to the delay", "option_d": "Request additional resources to catch up", "correct_answer": "B", "explanation": "Rebuilding trust starts with taking accountability for failures.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Support team performance",
                        "description": "Foster an environment that enables the team to deliver value, remove impediments, and recognize contributions.",
                        "order": 7,
                        "flashcards": [
                            {"front": "What is a high-performing team?", "back": "A team that consistently achieves goals, collaborates effectively, maintains trust, and continuously improves its processes."},
                            {"front": "What are impediments?", "back": "Obstacles that slow or block the team's progress, which the PM or Scrum Master helps remove."},
                            {"front": "What is recognition in project management?", "back": "Acknowledging team and individual contributions to reinforce positive behaviors and maintain motivation."},
                            {"front": "What is a team charter?", "back": "A document establishing team values, agreements, and operating guidelines created collaboratively by team members."},
                            {"front": "What is colocation?", "back": "Placing team members in the same physical location to improve communication and collaboration. Virtual colocation uses digital tools."},
                        ],
                        "questions": [
                            {"question_text": "A team member reports being blocked by a dependency on another team. What should the PM do?", "option_a": "Add the blocker to the risk register", "option_b": "Work to remove the impediment", "option_c": "Assign the team member to other tasks", "option_d": "Escalate to the steering committee", "correct_answer": "B", "explanation": "The PM's role includes actively removing impediments that block team progress.", "difficulty": "easy"},
                            {"question_text": "How should a PM recognize a team member's exceptional contribution on a cross-cultural team?", "option_a": "Public recognition in the team meeting", "option_b": "Consider cultural preferences for recognition", "option_c": "Monetary bonus", "option_d": "Formal letter to their manager", "correct_answer": "B", "explanation": "Recognition methods should be culturally appropriate as some cultures prefer private acknowledgment.", "difficulty": "medium"},
                            {"question_text": "A distributed team is experiencing communication challenges. What is the BEST solution?", "option_a": "Require all communication in writing", "option_b": "Implement virtual colocation practices", "option_c": "Relocate team members to one office", "option_d": "Reduce the team size", "correct_answer": "B", "explanation": "Virtual colocation uses digital tools to create collaborative spaces for distributed teams.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Manage conflict",
                        "description": "Identify, analyze, and address conflicts constructively to maintain team effectiveness.",
                        "order": 8,
                        "flashcards": [
                            {"front": "What are the conflict resolution techniques?", "back": "Collaborate/Problem-solve, Compromise, Smooth/Accommodate, Force/Direct, Withdraw/Avoid."},
                            {"front": "What is the best conflict resolution approach?", "back": "Collaborate/Problem-solve - works together to find a win-win solution addressing everyone's concerns."},
                            {"front": "What are common sources of conflict?", "back": "Schedules, priorities, resources, technical opinions, administrative procedures, cost, and personalities."},
                            {"front": "When is conflict beneficial?", "back": "Constructive conflict can lead to better solutions, innovation, and stronger team dynamics when managed properly."},
                            {"front": "What is the Thomas-Kilmann Conflict Mode?", "back": "A framework describing five conflict-handling modes based on assertiveness and cooperativeness dimensions."},
                        ],
                        "questions": [
                            {"question_text": "Two team members have a technical disagreement that is affecting team morale. What approach should the PM use?", "option_a": "Force a decision based on PM's opinion", "option_b": "Facilitate collaborative problem-solving", "option_c": "Avoid involvement and let them resolve it", "option_d": "Compromise by using parts of both approaches", "correct_answer": "B", "explanation": "Collaborative problem-solving leads to the best solutions and maintains relationships.", "difficulty": "medium"},
                            {"question_text": "Which conflict resolution technique results in a lose-lose outcome?", "option_a": "Collaborate", "option_b": "Compromise", "option_c": "Withdraw", "option_d": "Force", "correct_answer": "C", "explanation": "Withdrawing avoids the conflict without resolution, leaving both parties unsatisfied.", "difficulty": "easy"},
                            {"question_text": "A conflict about project priorities needs immediate resolution before a deadline. Which technique is MOST appropriate?", "option_a": "Collaborate", "option_b": "Compromise", "option_c": "Force", "option_d": "Smooth", "correct_answer": "C", "explanation": "When time is critical and a decision must be made, forcing may be necessary, though not ideal for relationships.", "difficulty": "hard"},
                        ],
                    },
                ],
            },
            {
                "name": "Process",
                "description": "Planning, execution, monitoring, and adaptation of project work across methodologies.",
                "weight": 41.0,
                "order": 2,
                "tasks": [
                    {
                        "name": "Define and break down scope",
                        "description": "Define project scope, create WBS or product backlog, and obtain stakeholder agreement.",
                        "order": 1,
                        "flashcards": [
                            {"front": "What is a Work Breakdown Structure (WBS)?", "back": "A hierarchical decomposition of the total scope of work to accomplish project objectives and create deliverables."},
                            {"front": "What is a product backlog?", "back": "An ordered list of everything needed in the product, maintained by the Product Owner, continuously refined and prioritized."},
                            {"front": "What is scope creep?", "back": "Uncontrolled expansion of project scope without adjustments to time, cost, and resources."},
                            {"front": "What is a work package?", "back": "The lowest level of the WBS, a deliverable that can be estimated, scheduled, monitored, and controlled."},
                            {"front": "What is a user story?", "back": "A short description of functionality from the user's perspective: As a [user], I want [goal] so that [benefit]."},
                        ],
                        "questions": [
                            {"question_text": "A stakeholder requests additional features after the scope baseline is approved. What should the PM do?", "option_a": "Add the features to accommodate the stakeholder", "option_b": "Process the request through change control", "option_c": "Reject the request to prevent scope creep", "option_d": "Defer the request to a future phase", "correct_answer": "B", "explanation": "All scope changes should go through the integrated change control process.", "difficulty": "easy"},
                            {"question_text": "In agile, who is responsible for prioritizing the product backlog?", "option_a": "Scrum Master", "option_b": "Development Team", "option_c": "Product Owner", "option_d": "Project Manager", "correct_answer": "C", "explanation": "The Product Owner is responsible for the product backlog and its prioritization.", "difficulty": "easy"},
                            {"question_text": "What is the PRIMARY purpose of decomposing scope into a WBS?", "option_a": "To assign resources to activities", "option_b": "To organize and define total project scope", "option_c": "To create the project schedule", "option_d": "To estimate project costs", "correct_answer": "B", "explanation": "The WBS organizes and defines the total scope by breaking it into manageable components.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Prioritize work based on value",
                        "description": "Prioritize deliverables and features based on business value, stakeholder feedback, and dependencies.",
                        "order": 2,
                        "flashcards": [
                            {"front": "What is MoSCoW prioritization?", "back": "A technique categorizing requirements as Must have, Should have, Could have, and Won't have for this release."},
                            {"front": "What is value-based prioritization?", "back": "Ordering work items based on the business value they deliver relative to effort required."},
                            {"front": "What is Weighted Shortest Job First (WSJF)?", "back": "A prioritization method using (Business Value + Time Criticality + Risk Reduction) / Job Size."},
                            {"front": "What is the cost of delay?", "back": "The economic impact of not delivering a feature or product on time, used to prioritize based on urgency."},
                            {"front": "What is a Minimum Viable Product (MVP)?", "back": "A version with just enough features to satisfy early customers and provide feedback for future development."},
                        ],
                        "questions": [
                            {"question_text": "A product has limited development capacity. Which prioritization technique considers both value and effort?", "option_a": "MoSCoW", "option_b": "WSJF", "option_c": "Kano Model", "option_d": "Stack Ranking", "correct_answer": "B", "explanation": "WSJF divides value factors by job size to prioritize items with best value-to-effort ratio.", "difficulty": "medium"},
                            {"question_text": "Using MoSCoW prioritization, which category represents requirements that are NOT in the current scope?", "option_a": "Must have", "option_b": "Should have", "option_c": "Could have", "option_d": "Won't have", "correct_answer": "D", "explanation": "Won't have items are out of scope for the current release but may be considered later.", "difficulty": "easy"},
                            {"question_text": "A feature has high business value but also high complexity. How should this inform prioritization?", "option_a": "Prioritize it first due to high value", "option_b": "Consider value relative to effort investment", "option_c": "Deprioritize due to complexity", "option_d": "Split it into smaller features", "correct_answer": "B", "explanation": "Prioritization should consider both value delivered and effort required for balanced decisions.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Assess opportunities for incremental delivery",
                        "description": "Identify opportunities to deliver value incrementally rather than at project end.",
                        "order": 3,
                        "flashcards": [
                            {"front": "What is incremental delivery?", "back": "Delivering project scope in usable portions throughout the project rather than all at once at the end."},
                            {"front": "What is a release plan?", "back": "A plan showing which features will be delivered in which releases, typically spanning multiple iterations."},
                            {"front": "What are the benefits of incremental delivery?", "back": "Earlier value realization, faster feedback, reduced risk, improved stakeholder engagement, and ability to adapt."},
                            {"front": "What is continuous delivery?", "back": "A practice where code changes are automatically built, tested, and prepared for release to production."},
                            {"front": "What is a potentially shippable increment?", "back": "In Scrum, the output of a sprint that meets the Definition of Done and could be released if desired."},
                        ],
                        "questions": [
                            {"question_text": "A project sponsor wants to see value sooner rather than waiting for the final delivery. What approach should the PM recommend?", "option_a": "Add more resources to finish faster", "option_b": "Implement incremental delivery", "option_c": "Reduce project scope", "option_d": "Compress the schedule", "correct_answer": "B", "explanation": "Incremental delivery allows stakeholders to receive usable portions of scope throughout the project.", "difficulty": "easy"},
                            {"question_text": "What is the PRIMARY benefit of delivering a Minimum Viable Product first?", "option_a": "Reduces development costs", "option_b": "Gets early feedback to guide further development", "option_c": "Satisfies all stakeholder requirements", "option_d": "Eliminates the need for future releases", "correct_answer": "B", "explanation": "MVP enables learning from real users to inform and improve subsequent development.", "difficulty": "medium"},
                            {"question_text": "In Scrum, what determines if an increment can be released?", "option_a": "Product Owner approval", "option_b": "Meeting the Definition of Done", "option_c": "Stakeholder sign-off", "option_d": "Sprint Review acceptance", "correct_answer": "B", "explanation": "The Definition of Done establishes the quality criteria an increment must meet to be releasable.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Define and manage resources",
                        "description": "Identify, acquire, and manage physical and team resources needed for the project.",
                        "order": 4,
                        "flashcards": [
                            {"front": "What is a resource breakdown structure?", "back": "A hierarchical representation of resources by category and type used to organize resource planning."},
                            {"front": "What is resource leveling?", "back": "A technique to adjust start and finish dates based on resource limits, often extending the schedule."},
                            {"front": "What is resource smoothing?", "back": "A technique to adjust activities within float without extending the project schedule."},
                            {"front": "What is a resource calendar?", "back": "A calendar showing when and how resources are available, including working days, shifts, and holidays."},
                            {"front": "What is a responsibility assignment matrix (RAM)?", "back": "A grid showing project resources assigned to work packages; RACI is a common format."},
                        ],
                        "questions": [
                            {"question_text": "A project has over-allocated resources during certain periods. What technique should be applied FIRST?", "option_a": "Resource leveling", "option_b": "Resource smoothing", "option_c": "Fast tracking", "option_d": "Crashing", "correct_answer": "B", "explanation": "Try resource smoothing first as it doesn't extend the schedule; use leveling if needed.", "difficulty": "medium"},
                            {"question_text": "What does the 'C' in RACI stand for?", "option_a": "Contributor", "option_b": "Consulted", "option_c": "Coordinator", "option_d": "Controller", "correct_answer": "B", "explanation": "RACI = Responsible, Accountable, Consulted, Informed.", "difficulty": "easy"},
                            {"question_text": "A critical resource is only available part-time. How should this be handled in planning?", "option_a": "Ignore the constraint and assign full-time", "option_b": "Reflect availability in the resource calendar", "option_c": "Remove them from the project", "option_d": "Outsource their work", "correct_answer": "B", "explanation": "Resource calendars should accurately reflect availability to enable realistic planning.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Plan and execute procurement",
                        "description": "Plan, conduct, and manage procurement of goods and services from external sources.",
                        "order": 5,
                        "flashcards": [
                            {"front": "What are the main contract types?", "back": "Fixed Price (FP), Time and Materials (T&M), and Cost Reimbursable (CR) with various subtypes."},
                            {"front": "What is a Statement of Work (SOW)?", "back": "A description of the products, services, or results to be delivered by a seller."},
                            {"front": "What is a make-or-buy decision?", "back": "Analysis to determine whether to produce internally or purchase from external sources."},
                            {"front": "What is a Request for Proposal (RFP)?", "back": "A document used to solicit proposals from prospective sellers when the solution approach is not predetermined."},
                            {"front": "What is contract administration?", "back": "Managing the contract relationship, monitoring performance, and making changes as needed."},
                        ],
                        "questions": [
                            {"question_text": "A project needs specialized expertise not available internally. The scope is well-defined. Which contract type is BEST?", "option_a": "Cost Plus Fixed Fee", "option_b": "Time and Materials", "option_c": "Fixed Price", "option_d": "Cost Plus Incentive Fee", "correct_answer": "C", "explanation": "Fixed Price is best when scope is well-defined, transferring risk to the seller.", "difficulty": "medium"},
                            {"question_text": "Which document would you use when you know what you need but want sellers to propose how to deliver it?", "option_a": "Request for Quote (RFQ)", "option_b": "Request for Proposal (RFP)", "option_c": "Invitation for Bid (IFB)", "option_d": "Request for Information (RFI)", "correct_answer": "B", "explanation": "RFP is used when you want sellers to propose solutions and approaches.", "difficulty": "easy"},
                            {"question_text": "A vendor is consistently underperforming on deliverables. What should the PM do FIRST?", "option_a": "Terminate the contract", "option_b": "Review the contract terms and document issues", "option_c": "Find a replacement vendor", "option_d": "Escalate to legal department", "correct_answer": "B", "explanation": "First understand contractual obligations and document performance issues before taking action.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Recommend project management approach",
                        "description": "Recommend and adapt the project management approach (predictive, adaptive, or hybrid) based on project needs.",
                        "order": 6,
                        "flashcards": [
                            {"front": "What is a predictive approach?", "back": "A development approach where scope, time, and cost are determined early and changes are carefully managed. Also called waterfall."},
                            {"front": "What is an adaptive approach?", "back": "An iterative approach where requirements and solutions evolve through collaboration. Includes agile methodologies."},
                            {"front": "What is a hybrid approach?", "back": "A combination of predictive and adaptive elements tailored to project needs."},
                            {"front": "What factors influence approach selection?", "back": "Requirements stability, stakeholder availability, organizational culture, risk tolerance, regulations, and team experience."},
                            {"front": "What is project tailoring?", "back": "Selecting and adapting processes, tools, techniques, and methods appropriate for the specific project."},
                        ],
                        "questions": [
                            {"question_text": "A project has stable requirements, strict regulations, and needs detailed upfront planning. Which approach is BEST?", "option_a": "Agile", "option_b": "Predictive", "option_c": "Hybrid", "option_d": "Iterative", "correct_answer": "B", "explanation": "Predictive approach suits stable requirements and regulatory environments needing upfront planning.", "difficulty": "easy"},
                            {"question_text": "An organization wants to adopt agile but has fixed contracts with clients. What approach should be considered?", "option_a": "Pure agile ignoring contracts", "option_b": "Hybrid approach", "option_c": "Pure waterfall", "option_d": "Cancel existing contracts", "correct_answer": "B", "explanation": "Hybrid approach allows agile practices while accommodating fixed contract constraints.", "difficulty": "medium"},
                            {"question_text": "What is the PRIMARY factor when deciding between predictive and adaptive approaches?", "option_a": "Team size", "option_b": "Budget constraints", "option_c": "Requirements stability and clarity", "option_d": "Project duration", "correct_answer": "C", "explanation": "The degree of requirements stability is the key factor in approach selection.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Create and maintain project plan",
                        "description": "Develop and maintain the integrated project management plan and subsidiary plans.",
                        "order": 7,
                        "flashcards": [
                            {"front": "What is the project management plan?", "back": "The document describing how the project will be executed, monitored, controlled, and closed."},
                            {"front": "What are subsidiary plans?", "back": "Component plans for scope, schedule, cost, quality, resources, communications, risk, procurement, and stakeholder management."},
                            {"front": "What are project baselines?", "back": "Approved versions of scope, schedule, and cost plans used to measure and compare actual performance."},
                            {"front": "When should the project plan be updated?", "back": "When approved changes occur, as part of progressive elaboration, or when planning assumptions change."},
                            {"front": "What is rolling wave planning?", "back": "An iterative planning technique where near-term work is planned in detail while future work is planned at a higher level."},
                        ],
                        "questions": [
                            {"question_text": "The project scope has been approved but the schedule is still being developed. What type of planning is this?", "option_a": "Fast tracking", "option_b": "Rolling wave planning", "option_c": "Progressive elaboration", "option_d": "Crashing", "correct_answer": "C", "explanation": "Progressive elaboration refines plans as more information becomes available.", "difficulty": "medium"},
                            {"question_text": "What document establishes the approved scope, schedule, and cost baselines?", "option_a": "Project charter", "option_b": "Project management plan", "option_c": "Scope statement", "option_d": "Work breakdown structure", "correct_answer": "B", "explanation": "The project management plan contains the approved baselines for scope, schedule, and cost.", "difficulty": "easy"},
                            {"question_text": "An approved change affects the project schedule. What must be updated?", "option_a": "Only the schedule baseline", "option_b": "All affected plan components and baselines", "option_c": "The project charter", "option_d": "Only the change log", "correct_answer": "B", "explanation": "Approved changes require updating all affected components of the project management plan.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Collect and analyze data",
                        "description": "Gather project data and analyze it to make informed decisions and take appropriate actions.",
                        "order": 8,
                        "flashcards": [
                            {"front": "What is Earned Value Management (EVM)?", "back": "A methodology integrating scope, schedule, and cost to measure project performance and progress."},
                            {"front": "What is Schedule Variance (SV)?", "back": "SV = EV - PV. Positive means ahead of schedule, negative means behind schedule."},
                            {"front": "What is Cost Variance (CV)?", "back": "CV = EV - AC. Positive means under budget, negative means over budget."},
                            {"front": "What is Schedule Performance Index (SPI)?", "back": "SPI = EV / PV. Greater than 1 means ahead of schedule, less than 1 means behind."},
                            {"front": "What is Cost Performance Index (CPI)?", "back": "CPI = EV / AC. Greater than 1 means under budget, less than 1 means over budget."},
                        ],
                        "questions": [
                            {"question_text": "A project has CPI = 0.9 and SPI = 1.1. What does this indicate?", "option_a": "Over budget and behind schedule", "option_b": "Under budget and ahead of schedule", "option_c": "Over budget and ahead of schedule", "option_d": "Under budget and behind schedule", "correct_answer": "C", "explanation": "CPI < 1 means over budget; SPI > 1 means ahead of schedule.", "difficulty": "medium"},
                            {"question_text": "EV = $100,000, PV = $120,000, AC = $110,000. What is the Schedule Variance?", "option_a": "-$10,000", "option_b": "-$20,000", "option_c": "$10,000", "option_d": "$20,000", "correct_answer": "B", "explanation": "SV = EV - PV = $100,000 - $120,000 = -$20,000 (behind schedule).", "difficulty": "medium"},
                            {"question_text": "Which metric would you use to forecast the total cost at completion?", "option_a": "CV", "option_b": "SPI", "option_c": "EAC", "option_d": "VAC", "correct_answer": "C", "explanation": "Estimate at Completion (EAC) forecasts the total expected cost when the project is complete.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Manage risk",
                        "description": "Identify, analyze, plan responses, and monitor risks throughout the project.",
                        "order": 9,
                        "flashcards": [
                            {"front": "What is a risk?", "back": "An uncertain event that, if it occurs, has a positive or negative effect on project objectives."},
                            {"front": "What are the risk response strategies for threats?", "back": "Avoid, Transfer, Mitigate, Accept, and Escalate."},
                            {"front": "What are the risk response strategies for opportunities?", "back": "Exploit, Share, Enhance, Accept, and Escalate."},
                            {"front": "What is a risk register?", "back": "A document containing risk identification, analysis, response planning, and monitoring information."},
                            {"front": "What is Expected Monetary Value (EMV)?", "back": "EMV = Probability x Impact. Used in quantitative risk analysis to calculate average risk outcomes."},
                        ],
                        "questions": [
                            {"question_text": "A risk has a 30% probability of occurring with a $100,000 impact. What is the EMV?", "option_a": "$30,000", "option_b": "$70,000", "option_c": "$100,000", "option_d": "$130,000", "correct_answer": "A", "explanation": "EMV = 30% x $100,000 = $30,000.", "difficulty": "easy"},
                            {"question_text": "A project team decides to purchase insurance for a potential liability. Which risk response strategy is this?", "option_a": "Avoid", "option_b": "Transfer", "option_c": "Mitigate", "option_d": "Accept", "correct_answer": "B", "explanation": "Insurance transfers the financial impact of the risk to another party.", "difficulty": "easy"},
                            {"question_text": "A risk is identified that could provide significant benefit if it occurs. What strategy would INCREASE its probability?", "option_a": "Share", "option_b": "Exploit", "option_c": "Enhance", "option_d": "Accept", "correct_answer": "C", "explanation": "Enhance increases the probability and/or positive impact of an opportunity.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Manage change",
                        "description": "Evaluate, approve, and implement changes through integrated change control.",
                        "order": 10,
                        "flashcards": [
                            {"front": "What is integrated change control?", "back": "The process of reviewing, approving, and managing changes to deliverables, documents, and baselines."},
                            {"front": "What is a Change Control Board (CCB)?", "back": "A formally chartered group responsible for reviewing, evaluating, approving, or rejecting changes."},
                            {"front": "What is a change request?", "back": "A formal proposal to modify a document, deliverable, or baseline that goes through change control."},
                            {"front": "What is configuration management?", "back": "A system for managing changes to project artifacts, ensuring consistency and traceability."},
                            {"front": "What is the change log?", "back": "A document listing all change requests and their current status throughout the project."},
                        ],
                        "questions": [
                            {"question_text": "A stakeholder requests a change that would impact the project baseline. Who should approve it?", "option_a": "Project Manager", "option_b": "Change Control Board", "option_c": "Project Sponsor", "option_d": "Stakeholder who requested it", "correct_answer": "B", "explanation": "Baseline changes require CCB approval through integrated change control.", "difficulty": "easy"},
                            {"question_text": "A team member made a scope change without approval. What should the PM do FIRST?", "option_a": "Update the scope baseline", "option_b": "Assess the impact of the change", "option_c": "Reverse the change immediately", "option_d": "Escalate to the sponsor", "correct_answer": "B", "explanation": "First assess the impact, then determine whether to process through change control or reverse.", "difficulty": "medium"},
                            {"question_text": "In agile projects, how are changes typically handled?", "option_a": "Through formal change control board", "option_b": "By updating the product backlog", "option_c": "Changes are not allowed", "option_d": "Through a change request process", "correct_answer": "B", "explanation": "Agile welcomes changes through backlog reprioritization rather than formal change control.", "difficulty": "easy"},
                        ],
                    },
                ],
            },
            {
                "name": "Business Environment",
                "description": "Strategic alignment, governance, and value delivery in the organizational context.",
                "weight": 26.0,
                "order": 3,
                "tasks": [
                    {
                        "name": "Evaluate external business environment",
                        "description": "Assess changes in the external environment including regulations, technology, and market conditions.",
                        "order": 1,
                        "flashcards": [
                            {"front": "What is a PESTLE analysis?", "back": "A framework analyzing Political, Economic, Social, Technological, Legal, and Environmental external factors."},
                            {"front": "What are regulatory impacts on projects?", "back": "Compliance requirements, industry standards, data privacy laws, and safety regulations that constrain project decisions."},
                            {"front": "What is environmental scanning?", "back": "Continuously monitoring external factors that could impact the project or organization."},
                            {"front": "What are geopolitical risks?", "back": "Risks from political instability, trade policies, sanctions, or international relations affecting project operations."},
                            {"front": "What is technology disruption?", "back": "Changes in technology that may obsolete project deliverables or require adaptation of project approach."},
                        ],
                        "questions": [
                            {"question_text": "New privacy regulations are announced that affect the project's data handling. What should the PM do FIRST?", "option_a": "Halt the project until regulations are clear", "option_b": "Assess impact on project scope and requirements", "option_c": "Continue as planned and adapt later", "option_d": "Escalate to legal department only", "correct_answer": "B", "explanation": "First assess how the regulatory change impacts the project to inform appropriate response.", "difficulty": "medium"},
                            {"question_text": "Which external factor is analyzed in the 'T' component of PESTLE?", "option_a": "Taxation policies", "option_b": "Trade agreements", "option_c": "Technological changes", "option_d": "Transportation infrastructure", "correct_answer": "C", "explanation": "T in PESTLE represents Technological factors affecting the environment.", "difficulty": "easy"},
                            {"question_text": "A project relies on a vendor in a country experiencing political instability. What type of risk is this?", "option_a": "Technical risk", "option_b": "Geopolitical risk", "option_c": "Financial risk", "option_d": "Operational risk", "correct_answer": "B", "explanation": "Political instability in vendor countries represents geopolitical risk.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Assess impact on project scope/backlog",
                        "description": "Evaluate how external changes affect project scope, requirements, and backlog items.",
                        "order": 2,
                        "flashcards": [
                            {"front": "What is impact analysis?", "back": "Evaluating how changes (internal or external) affect project scope, schedule, cost, quality, and risks."},
                            {"front": "How do regulatory changes affect scope?", "back": "May require new features, modified requirements, additional documentation, or compliance activities."},
                            {"front": "What is backlog refinement?", "back": "The ongoing process of reviewing, updating, and reprioritizing backlog items based on new information."},
                            {"front": "What is scope validation?", "back": "Formalizing acceptance of completed deliverables with stakeholders to ensure they meet requirements."},
                            {"front": "What triggers scope reassessment?", "back": "Market changes, technology shifts, regulatory updates, stakeholder feedback, or strategic pivots."},
                        ],
                        "questions": [
                            {"question_text": "A competitor launches a feature that customers now expect. How should this impact the project?", "option_a": "Ignore it and continue with original plan", "option_b": "Assess impact and consider backlog updates", "option_c": "Immediately add the feature to current sprint", "option_d": "Cancel the project", "correct_answer": "B", "explanation": "Market changes should be assessed for impact and may require backlog reprioritization.", "difficulty": "medium"},
                            {"question_text": "New technology makes a planned feature obsolete. What should the PM recommend?", "option_a": "Complete the feature as planned", "option_b": "Remove or replace the feature after impact analysis", "option_c": "Pause the project", "option_d": "Ignore the technology change", "correct_answer": "B", "explanation": "Technology changes may require scope adjustment after analyzing impact and alternatives.", "difficulty": "medium"},
                            {"question_text": "During backlog refinement, the team discovers a regulatory requirement was missed. What is the BEST response?", "option_a": "Add it to the backlog and prioritize appropriately", "option_b": "Complete the current sprint first", "option_c": "Report it to regulators immediately", "option_d": "Remove other items to compensate", "correct_answer": "A", "explanation": "Discovered requirements should be added to the backlog and prioritized based on importance.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Help ensure value-based delivery",
                        "description": "Focus on delivering value aligned with business objectives and stakeholder needs.",
                        "order": 3,
                        "flashcards": [
                            {"front": "What is business value?", "back": "The net benefit derived from a business endeavor, including tangible and intangible benefits."},
                            {"front": "What is a value stream?", "back": "The set of actions required to deliver value from concept to customer, including both value-adding and non-value-adding steps."},
                            {"front": "What is Return on Investment (ROI)?", "back": "A measure of project profitability: (Gains - Costs) / Costs, expressed as a percentage."},
                            {"front": "What are Key Performance Indicators (KPIs)?", "back": "Quantifiable measures used to evaluate the success of a project in meeting its objectives."},
                            {"front": "What is a benefits realization plan?", "back": "A document describing how and when benefits will be delivered and measured."},
                        ],
                        "questions": [
                            {"question_text": "A project delivers all features on time and budget, but users don't adopt it. Was the project successful?", "option_a": "Yes, it met scope, schedule, and cost targets", "option_b": "No, it failed to deliver business value", "option_c": "Partially successful", "option_d": "Success cannot be determined", "correct_answer": "B", "explanation": "Project success is ultimately measured by value delivery, not just meeting constraints.", "difficulty": "medium"},
                            {"question_text": "What is the PRIMARY purpose of identifying value streams?", "option_a": "To assign resources efficiently", "option_b": "To eliminate waste and optimize value delivery", "option_c": "To create the project schedule", "option_d": "To satisfy regulatory requirements", "correct_answer": "B", "explanation": "Value stream mapping identifies waste and opportunities to improve value delivery.", "difficulty": "medium"},
                            {"question_text": "A project has an expected benefit of $500,000 and a cost of $200,000. What is the ROI?", "option_a": "40%", "option_b": "150%", "option_c": "250%", "option_d": "60%", "correct_answer": "B", "explanation": "ROI = ($500,000 - $200,000) / $200,000 = 150%.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Verify measurement systems for benefits",
                        "description": "Establish and verify systems to measure and track benefit realization.",
                        "order": 4,
                        "flashcards": [
                            {"front": "What is benefits measurement?", "back": "The process of quantifying and tracking the value delivered by a project against expected benefits."},
                            {"front": "What is a benefits owner?", "back": "The person accountable for ensuring projected benefits are realized after project completion."},
                            {"front": "What is benefits tracking?", "back": "Ongoing monitoring of actual vs. expected benefits using defined metrics and measurement systems."},
                            {"front": "What is a success metric?", "back": "A quantifiable indicator used to determine if project objectives and benefits are being achieved."},
                            {"front": "When does benefits realization occur?", "back": "Often after project closure, during operations, requiring handoff to a benefits owner."},
                        ],
                        "questions": [
                            {"question_text": "Who is typically responsible for benefits realization after project closure?", "option_a": "Project Manager", "option_b": "Benefits Owner", "option_c": "Project Sponsor", "option_d": "PMO", "correct_answer": "B", "explanation": "The benefits owner is accountable for ensuring projected benefits are realized post-project.", "difficulty": "easy"},
                            {"question_text": "A project's business case claims 20% cost reduction. When should this be measured?", "option_a": "At project closure", "option_b": "After the solution is operational", "option_c": "During project execution", "option_d": "During project planning", "correct_answer": "B", "explanation": "Most benefits are realized during operations after the project deliverables are in use.", "difficulty": "medium"},
                            {"question_text": "What should be established BEFORE project execution to enable benefits measurement?", "option_a": "Team performance metrics", "option_b": "Baseline measurements and target metrics", "option_c": "Resource utilization rates", "option_d": "Stakeholder satisfaction surveys", "correct_answer": "B", "explanation": "Baselines must be established before changes to measure the impact accurately.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Support organizational strategy",
                        "description": "Ensure projects align with and support organizational strategic objectives.",
                        "order": 5,
                        "flashcards": [
                            {"front": "What is strategic alignment?", "back": "Ensuring project goals and outcomes support the organization's strategic objectives and direction."},
                            {"front": "What is a project portfolio?", "back": "A collection of projects, programs, and operations managed as a group to achieve strategic objectives."},
                            {"front": "What is organizational project management (OPM)?", "back": "A framework linking project, program, and portfolio management to organizational strategy."},
                            {"front": "What is a strategic initiative?", "back": "A program or project specifically designed to advance organizational strategic goals."},
                            {"front": "How do projects support strategy?", "back": "By delivering capabilities, products, or changes that enable strategic goals and competitive advantage."},
                        ],
                        "questions": [
                            {"question_text": "A project is on track but no longer aligns with changed organizational strategy. What should happen?", "option_a": "Complete the project as planned", "option_b": "Recommend reassessment or termination", "option_c": "Accelerate completion", "option_d": "Add resources to finish faster", "correct_answer": "B", "explanation": "Projects should be reassessed when strategic alignment is lost; continuation may waste resources.", "difficulty": "medium"},
                            {"question_text": "What is the PRIMARY purpose of portfolio management?", "option_a": "Manage project resources", "option_b": "Align projects with organizational strategy", "option_c": "Track project schedules", "option_d": "Manage project risks", "correct_answer": "B", "explanation": "Portfolio management ensures the right projects are selected and prioritized for strategic value.", "difficulty": "easy"},
                            {"question_text": "How should a PM demonstrate strategic alignment of their project?", "option_a": "Deliver on time and budget", "option_b": "Link project outcomes to strategic objectives", "option_c": "Maintain stakeholder satisfaction", "option_d": "Follow organizational processes", "correct_answer": "B", "explanation": "Strategic alignment is demonstrated by explicitly connecting project outcomes to strategic goals.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Navigate organizational change",
                        "description": "Help the organization and stakeholders adapt to changes resulting from project outcomes.",
                        "order": 6,
                        "flashcards": [
                            {"front": "What is organizational change management?", "back": "A structured approach to transitioning individuals, teams, and organizations to a desired future state."},
                            {"front": "What is the ADKAR model?", "back": "A change management framework: Awareness, Desire, Knowledge, Ability, Reinforcement."},
                            {"front": "What is change resistance?", "back": "Opposition to change due to fear, uncertainty, loss of control, or perceived negative impacts."},
                            {"front": "What is a change agent?", "back": "A person who facilitates and promotes change within an organization."},
                            {"front": "What is sustainability in change?", "back": "Ensuring changes are embedded and maintained in the organization after the project ends."},
                        ],
                        "questions": [
                            {"question_text": "Users are resisting a new system being implemented. According to ADKAR, what is likely missing?", "option_a": "Knowledge of how to use it", "option_b": "Awareness or Desire for the change", "option_c": "Ability to perform", "option_d": "Reinforcement mechanisms", "correct_answer": "B", "explanation": "Resistance often stems from lack of awareness of why change is needed or desire to participate.", "difficulty": "medium"},
                            {"question_text": "What is the PM's role in organizational change management?", "option_a": "Solely delivering the technical solution", "option_b": "Supporting adoption and transition activities", "option_c": "Replacing the change management team", "option_d": "Enforcing compliance with new processes", "correct_answer": "B", "explanation": "PMs support change management by collaborating on adoption, training, and transition planning.", "difficulty": "easy"},
                            {"question_text": "A project will significantly change how employees work. When should change management activities begin?", "option_a": "After go-live", "option_b": "During project planning", "option_c": "During testing", "option_d": "At project closure", "correct_answer": "B", "explanation": "Change management should begin early in planning to prepare stakeholders for upcoming changes.", "difficulty": "easy"},
                        ],
                    },
                    {
                        "name": "Integrate sustainability and AI considerations",
                        "description": "Consider environmental sustainability and artificial intelligence impacts in project decisions.",
                        "order": 7,
                        "flashcards": [
                            {"front": "What is project sustainability?", "back": "Considering environmental, social, and economic impacts in project planning and execution."},
                            {"front": "What is the triple bottom line?", "back": "A framework measuring success across three dimensions: People, Planet, and Profit."},
                            {"front": "How can AI support project management?", "back": "Through predictive analytics, automation, risk assessment, resource optimization, and decision support."},
                            {"front": "What are AI ethics in projects?", "back": "Considerations including bias, transparency, privacy, accountability, and human oversight in AI use."},
                            {"front": "What is carbon footprint in projects?", "back": "The total greenhouse gas emissions caused by project activities and deliverables."},
                        ],
                        "questions": [
                            {"question_text": "A project can choose between a cheaper option with higher environmental impact or a sustainable alternative. What should guide the decision?", "option_a": "Always choose the cheaper option", "option_b": "Consider organizational sustainability policies and stakeholder values", "option_c": "Always choose the sustainable option", "option_d": "Let the sponsor decide without analysis", "correct_answer": "B", "explanation": "Decisions should align with organizational policies and consider multiple factors including sustainability.", "difficulty": "medium"},
                            {"question_text": "How can AI predictive analytics help project management?", "option_a": "Replace the project manager", "option_b": "Forecast risks, issues, and performance trends", "option_c": "Automate all project decisions", "option_d": "Eliminate the need for status meetings", "correct_answer": "B", "explanation": "AI can analyze data to predict trends and risks, supporting human decision-making.", "difficulty": "easy"},
                            {"question_text": "When implementing AI in a project, what ethical consideration is MOST important?", "option_a": "Maximizing automation", "option_b": "Ensuring transparency and human oversight", "option_c": "Reducing team size", "option_d": "Minimizing development time", "correct_answer": "B", "explanation": "AI ethics require transparency in how AI makes decisions and maintaining human accountability.", "difficulty": "medium"},
                        ],
                    },
                    {
                        "name": "Promote continuous improvement",
                        "description": "Foster a culture of learning and continuous improvement in project practices.",
                        "order": 8,
                        "flashcards": [
                            {"front": "What is continuous improvement?", "back": "An ongoing effort to improve processes, products, and services through incremental and breakthrough improvements."},
                            {"front": "What is a retrospective?", "back": "A meeting where the team reflects on what went well, what didn't, and how to improve."},
                            {"front": "What is the Plan-Do-Check-Act (PDCA) cycle?", "back": "A continuous improvement framework: Plan the change, Do/implement it, Check results, Act to standardize or adjust."},
                            {"front": "What are lessons learned?", "back": "Knowledge gained from project experiences that can be applied to improve future performance."},
                            {"front": "What is Kaizen?", "back": "A Japanese philosophy of continuous incremental improvement involving all employees."},
                        ],
                        "questions": [
                            {"question_text": "A Scrum team holds a meeting after each sprint to discuss improvements. What is this called?", "option_a": "Sprint Review", "option_b": "Sprint Retrospective", "option_c": "Sprint Planning", "option_d": "Daily Scrum", "correct_answer": "B", "explanation": "The Sprint Retrospective focuses on process improvement and team effectiveness.", "difficulty": "easy"},
                            {"question_text": "In the PDCA cycle, what happens in the 'Check' phase?", "option_a": "Implement the change", "option_b": "Evaluate results against expectations", "option_c": "Plan the improvement", "option_d": "Standardize the successful change", "correct_answer": "B", "explanation": "Check involves evaluating the results of the implemented change against expected outcomes.", "difficulty": "easy"},
                            {"question_text": "Lessons learned are documented but never referenced by future projects. What should be done?", "option_a": "Stop collecting lessons learned", "option_b": "Make lessons learned accessible and part of project initiation", "option_c": "Require reading all lessons before project start", "option_d": "Punish teams that don't use lessons learned", "correct_answer": "B", "explanation": "Lessons learned should be easily accessible and integrated into project planning processes.", "difficulty": "medium"},
                        ],
                    },
                ],
            },
        ],
    }


def seed_database(db: Session) -> dict:
    """Seed the database with PMP 2026 data."""
    data = get_pmp_2026_data()
    counts = {"domains": 0, "tasks": 0, "flashcards": 0, "questions": 0}

    for domain_data in data["domains"]:
        # Create domain
        domain = Domain(
            name=domain_data["name"],
            description=domain_data["description"],
            weight=domain_data["weight"],
            order=domain_data["order"],
        )
        db.add(domain)
        db.flush()  # Get the domain ID
        counts["domains"] += 1

        for task_data in domain_data["tasks"]:
            # Create task
            task = Task(
                domain_id=domain.id,
                name=task_data["name"],
                description=task_data["description"],
                order=task_data["order"],
            )
            db.add(task)
            db.flush()  # Get the task ID
            counts["tasks"] += 1

            # Create flashcards
            for fc_data in task_data["flashcards"]:
                flashcard = Flashcard(
                    task_id=task.id,
                    front=fc_data["front"],
                    back=fc_data["back"],
                )
                db.add(flashcard)
                counts["flashcards"] += 1

            # Create questions
            for q_data in task_data["questions"]:
                question = Question(
                    task_id=task.id,
                    question_text=q_data["question_text"],
                    option_a=q_data["option_a"],
                    option_b=q_data["option_b"],
                    option_c=q_data["option_c"],
                    option_d=q_data["option_d"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data["explanation"],
                    difficulty=q_data.get("difficulty", "medium"),
                )
                db.add(question)
                counts["questions"] += 1

    db.commit()
    return counts


def main():
    """Main function to run the seeding."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    print("Seeding PMP 2026 data...")
    db = SessionLocal()
    try:
        # Check if data already exists
        existing = db.query(Domain).first()
        if existing:
            print("Data already exists. Skipping seed.")
            return

        counts = seed_database(db)
        print(f"Seeded successfully!")
        print(f"  - Domains: {counts['domains']}")
        print(f"  - Tasks: {counts['tasks']}")
        print(f"  - Flashcards: {counts['flashcards']}")
        print(f"  - Questions: {counts['questions']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
