import type { TopicSession } from '../types';

export function createDemoSession(): TopicSession {
  const now = new Date().toISOString();
  return {
    id: 'demo-raft-consensus',
    topic: 'Distributed Consensus (Raft & Paxos)',
    level: 'intermediate',
    searchGrounding: true,
    createdAt: now,
    updatedAt: now,
    exploredItems: ['Leader Election', 'Log Replication'],
    knowledgeMap: {
      topic: 'Distributed Consensus (Raft & Paxos)',
      domain: 'Distributed Systems & Computer Science',
      overview:
        'Distributed consensus enables a cluster of independent, fault-prone nodes to agree on a single sequence of state transitions or values despite network partitions and crash failures.',
      prerequisites: [
        'State Machine Replication',
        'Asynchronous Network Models & Partial Synchrony',
        'TCP/RPC Communication & Timeouts',
        'Quorum Intersection Mathematics',
      ],
      branches: [
        {
          id: 'branch-1',
          title: 'Theoretical Foundations',
          summary: 'Impossibility bounds and fault-tolerance guarantees in asynchronous networks.',
          subtopics: [
            'FLP Impossibility Theorem',
            'CAP & PACELC Trade-offs',
            'Safety vs Liveness Properties',
            'Quorum Intersection',
          ],
        },
        {
          id: 'branch-2',
          title: 'Raft Consensus Protocol',
          summary: 'Understandability-oriented decomposition into election, replication, and safety.',
          subtopics: [
            'Leader Election',
            'Log Replication',
            'Log Matching Property',
            'Cluster Membership Changes',
          ],
        },
        {
          id: 'branch-3',
          title: 'Paxos Family',
          summary: 'Classic single-decree and multi-decree consensus protocols.',
          subtopics: [
            'Single-Decree Synod',
            'Multi-Paxos Optimization',
            'Flexible Paxos Quorums',
          ],
        },
      ],
      keyTerms: [
        {
          term: 'Term',
          definition:
            'A monotonically increasing logical clock integer in Raft used to detect stale leaders.',
        },
        {
          term: 'Quorum',
          definition:
            'A subset of nodes (typically a strict majority, more than N/2) guaranteeing overlap between any two quorums.',
        },
        {
          term: 'Split Vote',
          definition:
            'An election round where multiple candidates receive equal votes and none achieves a majority.',
        },
        {
          term: 'Commit Index',
          definition:
            'The highest log entry index known to be safely replicated on a majority of servers.',
        },
      ],
      coreTheories: [
        'Fischer-Lynch-Paterson (FLP) Impossibility',
        'State Machine Replication (SMR)',
        'Leader Completeness Invariant',
      ],
      applications: [
        'etcd (Kubernetes control plane coordination)',
        'CockroachDB & TiKV distributed transactional storage',
        'Apache ZooKeeper & HashiCorp Consul',
      ],
    },
    allSources: [
      {
        title: 'In Search of an Understandable Consensus Algorithm (Raft Paper)',
        url: 'https://raft.github.io/raft.pdf',
        domain: 'raft.github.io',
      },
      {
        title: 'Paxos Made Simple — Leslie Lamport',
        url: 'https://lamport.azurewebsites.net/pubs/paxos-simple.pdf',
        domain: 'lamport.azurewebsites.net',
      },
    ],
    messages: [
      {
        id: 'demo-msg-1',
        role: 'user',
        content: '/explain Leader Election',
        command: '/explain',
        modeLabel: 'Concept Explanation',
        timestamp: now,
      },
      {
        id: 'demo-msg-2',
        role: 'assistant',
        command: '/explain',
        modeLabel: 'Concept Explanation',
        searchGrounded: true,
        timestamp: now,
        sources: [
          {
            title: 'In Search of an Understandable Consensus Algorithm (Raft Paper)',
            url: 'https://raft.github.io/raft.pdf',
            domain: 'raft.github.io',
          },
        ],
        content: `### Direct Answer

In **Raft**, Leader Election ensures that at most one server acts as the cluster leader during any given logical **term**, using randomized election timeouts to break symmetry and majority quorums to guarantee safety.

### How It Works

1. **Heartbeat Monitoring**: Followers expect periodic \`AppendEntries\` RPC heartbeats from the current leader.
2. **Election Timeout**: If a follower receives no communication within its randomized timeout (typically $150\\text{ms}\\text{--}300\\text{ms}$), it increments \`currentTerm\`, transitions to **Candidate**, votes for itself, and broadcasts \`RequestVote\` RPCs.
3. **Majority Quorum**: With $N$ servers, a candidate wins the election if it collects votes from at least:

$$Q = \\left\\lfloor \\frac{N}{2} \\right\\rfloor + 1$$

4. **Log Up-to-Date Check**: Voters reject any candidate whose log is less up-to-date than their own (comparing last entry's term first, then index), preserving the **Leader Completeness** property.

| Server State | Role During Election | Key Transition Trigger |
| :--- | :--- | :--- |
| **Follower** | Grants at most one vote per term | Timeout expires $\\rightarrow$ Candidate |
| **Candidate** | Solicits \`RequestVote\` RPCs | Wins majority $\\rightarrow$ Leader |
| **Leader** | Sends periodic heartbeats | Discovers higher term $\\rightarrow$ Follower |`,
      },
    ],
  };
}
