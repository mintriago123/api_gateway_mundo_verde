import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # Tipos básicos
  scalar JSON
  scalar DateTime

  # Tipos de servicio
  type ServiceInfo {
    id: ID!
    name: String!
    endpoint: String!
    version: String!
    status: ServiceStatus!
    lastSeen: DateTime!
    metadata: JSON
    tags: [String!]!
    registeredAt: DateTime!
  }

  enum ServiceStatus {
    HEALTHY
    UNHEALTHY
    UNKNOWN
  }

  # Estadísticas del Gateway
  type GatewayStats {
    totalServices: Int!
    healthyServices: Int!
    unhealthyServices: Int!
    uptime: String!
    version: String!
    environment: String!
    serviceGroups: [ServiceGroup!]!
  }

  type ServiceGroup {
    name: String!
    instances: Int!
    healthy: Int!
    unhealthy: Int!
  }

  # Proxy de servicios
  type ProxyResponse {
    statusCode: Int!
    data: JSON
    error: String
    responseTime: Int!
    service: String!
    timestamp: DateTime!
  }

  input ProxyRequestInput {
    serviceName: String!
    path: String!
    method: String! = "GET"
    headers: JSON
    body: JSON
  }

  # Registro de servicios
  input ServiceRegistrationInput {
    name: String!
    host: String!
    port: Int!
    protocol: String! = "http"
    version: String! = "1.0.0"
    metadata: JSON
    tags: [String!] = []
  }

  # Auth y usuarios (para futuras implementaciones)
  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    active: Boolean!
    createdAt: DateTime!
  }

  enum UserRole {
    ADMIN
    USER
    GUEST
  }

  # Admisiones (ejemplo para el contexto educativo)
  type Student {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    dateOfBirth: DateTime
    status: StudentStatus!
    createdAt: DateTime!
  }

  enum StudentStatus {
    PENDING
    APPROVED
    REJECTED
    ENROLLED
  }

  type Application {
    id: ID!
    student: Student!
    program: String!
    academicYear: String!
    status: ApplicationStatus!
    submittedAt: DateTime!
    reviewedAt: DateTime
    documents: [Document!]!
  }

  enum ApplicationStatus {
    DRAFT
    SUBMITTED
    UNDER_REVIEW
    APPROVED
    REJECTED
  }

  type Document {
    id: ID!
    name: String!
    type: DocumentType!
    url: String!
    uploadedAt: DateTime!
  }

  enum DocumentType {
    TRANSCRIPT
    ID_DOCUMENT
    PHOTO
    RECOMMENDATION_LETTER
    PERSONAL_STATEMENT
    OTHER
  }

  # Queries principales
  type Query {
    # Gateway y Service Discovery
    gatewayStats: GatewayStats!
    services: [ServiceInfo!]!
    service(name: String!): [ServiceInfo!]!
    serviceById(id: ID!): ServiceInfo
    
    # Proxy de servicios
    proxyRequest(request: ProxyRequestInput!): ProxyResponse!
    
    # Auth Service Queries (delegadas)
    me: User
    users: [User!]!
    user(id: ID!): User
    
    # Admissions Service Queries (delegadas)
    students: [Student!]!
    student(id: ID!): Student
    applications: [Application!]!
    application(id: ID!): Application
    myApplications: [Application!]!
  }

  # Mutations principales  
  type Mutation {
    # Service Discovery
    registerService(input: ServiceRegistrationInput!): ServiceInfo!
    deregisterService(id: ID!): Boolean!
    
    # Auth Service Mutations (delegadas)
    login(email: String!, password: String!): AuthPayload!
    register(input: UserRegistrationInput!): AuthPayload!
    updateProfile(input: UserUpdateInput!): User!
    
    # Admissions Service Mutations (delegadas)
    createApplication(input: ApplicationInput!): Application!
    updateApplication(id: ID!, input: ApplicationUpdateInput!): Application!
    submitApplication(id: ID!): Application!
    reviewApplication(id: ID!, status: ApplicationStatus!, notes: String): Application!
    uploadDocument(applicationId: ID!, file: Upload!, type: DocumentType!): Document!
  }

  # Subscriptions para tiempo real
  type Subscription {
    # Gateway events
    serviceStatusChanged: ServiceInfo!
    gatewayStatsUpdated: GatewayStats!
    
    # Application events
    applicationStatusChanged(userId: ID): Application!
    newApplicationSubmitted: Application!
  }

  # Auth types
  type AuthPayload {
    token: String!
    user: User!
    expiresAt: DateTime!
  }

  input UserRegistrationInput {
    email: String!
    password: String!
    name: String!
    role: UserRole = USER
  }

  input UserUpdateInput {
    name: String
    email: String
  }

  # Application inputs
  input ApplicationInput {
    program: String!
    academicYear: String!
  }

  input ApplicationUpdateInput {
    program: String
    academicYear: String
  }

  # File upload (para documentos)
  scalar Upload
`;

export default typeDefs;
