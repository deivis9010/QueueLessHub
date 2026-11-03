/**
 * Client document in database
 */
export interface Client {
  _id?: string;
  id?: string;
  name?: string;
  phone: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Client response
 */
export interface ClientResponse {
  id: string;
  name?: string;
  phone: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Client create/update request
 */
export interface ClientInput {
  name?: string;
  phone?: string;
  status?: string;
}

/**
 * Client with conversation data
 */
export interface ClientWithConversation extends Client {
  conversation?: Record<string, unknown>;
}
