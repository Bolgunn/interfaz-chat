import { gql } from '@apollo/client';

export const SERVICES = gql`
  query Services {
    services { name up latencyMs }
  }
`;

// ---------- usuarios ----------
export const GET_USER = gql`
  query GetUser($id: ID!) { user(id: $id) { id displayName } }
`;

export const CREATE_USER = gql`
  mutation CreateUser($displayName: String!) {
    createUser(displayName: $displayName) { id displayName }
  }
`;

// ---------- canales y mensajes ----------
export const LIST_CHANNELS = gql`
  query Channels { channels { id name } }
`;

export const CREATE_CHANNEL = gql`
  mutation CreateChannel($name: String!) { createChannel(name: $name) { id name } }
`;

const POLL_FIELDS = gql`
  fragment PollFields on Poll {
    id channelId authorId question status durationMinutes
    closesAt createdAt closedAt totalVotes
    author { id displayName }
    options { id position text voteCount }
  }
`;

export const GET_CHANNEL_MESSAGES = gql`
  ${POLL_FIELDS}
  query ChannelMessages($channelId: ID!) {
    channel(id: $channelId) { id name }
    messages(channelId: $channelId) {
      id channelId authorId content createdAt pollId replyCount
      author { id displayName }
      poll { ...PollFields }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($channelId: ID!, $authorId: ID!, $content: String!) {
    sendMessage(channelId: $channelId, authorId: $authorId, content: $content) { id }
  }
`;

// ---------- threads ----------
export const GET_REPLIES = gql`
  query Replies($channelId: ID!, $messageId: ID!) {
    replies(channelId: $channelId, messageId: $messageId) {
      id authorId content createdAt
      author { id displayName }
    }
  }
`;

export const CREATE_REPLY = gql`
  mutation CreateReply($channelId: ID!, $messageId: ID!, $authorId: ID!, $content: String!) {
    createReply(channelId: $channelId, messageId: $messageId, authorId: $authorId, content: $content) {
      id
    }
  }
`;

// ---------- integrals ----------
const INTEGRAL_FIELDS = gql`
  fragment IntegralFields on Integral {
    id latex status durationMs createdAt
    result { latex numeric indefinite }
    error { code message }
    source { kind channelId authorId messageId }
  }
`;

export const LIST_INTEGRALS = gql`
  ${INTEGRAL_FIELDS}
  query Integrals($limit: Int, $offset: Int, $status: String) {
    integrals(limit: $limit, offset: $offset, status: $status) {
      total limit offset
      items { ...IntegralFields }
    }
  }
`;

export const CALCULATE_INTEGRAL = gql`
  ${INTEGRAL_FIELDS}
  mutation Calculate($latex: String!) {
    calculateIntegral(latex: $latex) { ...IntegralFields }
  }
`;

// ---------- polls ----------
export const LIST_POLLS = gql`
  ${POLL_FIELDS}
  query Polls($channelId: ID!) { polls(channelId: $channelId) { ...PollFields } }
`;

export const CREATE_POLL = gql`
  ${POLL_FIELDS}
  mutation CreatePoll($input: CreatePollInput!) { createPoll(input: $input) { ...PollFields } }
`;

export const VOTE_POLL = gql`
  ${POLL_FIELDS}
  mutation VotePoll($pollId: ID!, $voterId: ID!, $optionId: ID!) {
    votePoll(pollId: $pollId, voterId: $voterId, optionId: $optionId) { ...PollFields }
  }
`;

export const CLOSE_POLL = gql`
  ${POLL_FIELDS}
  mutation ClosePoll($pollId: ID!, $authorId: ID!) {
    closePoll(pollId: $pollId, authorId: $authorId) { ...PollFields }
  }
`;
