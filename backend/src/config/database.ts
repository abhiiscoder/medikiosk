/**
 * MEDiKIOSK Backend — Phase 01: MongoDB Database Connection
 * Connection lifecycle management, graceful shutdown, and health checking via Mongoose.
 */

import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

export interface DatabaseStatus {
  status: 'connected' | 'connecting' | 'disconnecting' | 'disconnected';
  host: string | null;
  name: string | null;
}

const READY_STATES: Record<number, DatabaseStatus['status']> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

/**
 * Initializes connection to MongoDB
 */
export async function connectDatabase(): Promise<boolean> {
  // Prevent duplicate connections
  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB is already connected.');
    return true;
  }

  // Setup connection event listeners
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
  });

  mongoose.connection.on('error', (err: Error) => {
    logger.error('MongoDB connection error occurred', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected');
  });

  try {
    logger.info('Connecting to MongoDB...', { uri: config.MONGODB_URI });
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database connection failure';
    logger.error('Failed to connect to MongoDB on startup', { error: message });
    
    // In production or test environments, bubble error if required
    if (config.NODE_ENV === 'production') {
      throw error;
    }
    return false;
  }
}

/**
 * Cleanly closes the MongoDB connection
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB connection closed gracefully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error disconnecting';
      logger.error('Error during MongoDB disconnect', { error: message });
    }
  }
}

/**
 * Returns the current database connectivity health status
 */
export function getDatabaseStatus(): DatabaseStatus {
  const readyState = mongoose.connection.readyState;
  const status = READY_STATES[readyState] ?? 'disconnected';

  return {
    status,
    host: status === 'connected' ? mongoose.connection.host : null,
    name: status === 'connected' ? mongoose.connection.name : null
  };
}
