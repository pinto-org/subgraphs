# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-chain subgraph indexing system for the Beanstalk/Pinto DeFi protocol. It consists of four specialized subgraphs that index blockchain events and provide GraphQL APIs for protocol data.

## Common Commands

### Development Commands

- `yarn codegen [subgraph]` - Generate TypeScript types from GraphQL schema and ABIs
- `yarn build <subgraph> <chain>` - Build a subgraph for deployment (e.g., `yarn build bean arbitrum`)
- `yarn test [subgraph]` - Run unit tests for a specific subgraph or all subgraphs
- `yarn testd [subgraph]` - Run tests in Docker (preferred method)
- `yarn testd-named <TestName>` - Run specific named tests in Docker
- `yarn build-cache` - Update historical cached values for L1->L2 migration
- `yarn prettier` - Format code

### Required Parameters

Most commands require specifying:

- **subgraph**: One of `bean`, `beanstalk`, `basin`, `beanft`
- **chain**: One of `ethereum`, `arbitrum`, `pinto` (for Base network)

### Testing

Docker testing is preferred since console output and some test cases can fail silently without it. First run `yarn run graph test -d` to build the Docker image, then use `yarn testd` scripts.

## Architecture Overview

### Subgraph Structure

The codebase is organized into four domain-specific subgraphs:

1. **`beanstalk`** - Core protocol mechanics (silo staking, field farming, marketplace, seasons)
2. **`bean`** - Token economics and price tracking across pools
3. **`basin`** - Liquidity pool infrastructure and trading activities
4. **`beanft`** - NFT collections and metadata

### Multi-Chain Support

Each subgraph supports three blockchain networks:

- **Ethereum**: Full Beanstalk protocol with legacy features
- **Arbitrum**: L2 deployment with migration support
- **Base (Pinto)**: Simplified protocol without unripe assets

### Core Infrastructure (`src/core/`)

- **Constants**: Runtime chain detection and protocol configuration
- **ABIs**: Centralized contract ABIs with versioning support
- **Utils**: Mathematical operations, data conversions, test infrastructure
- **Tests**: Shared testing utilities and mocking infrastructure

### Key Architectural Patterns

- **Entity-Driven Design**: Core entities with time-series snapshots
- **Handler-Based Processing**: Event handlers organized by functional area
- **Runtime Protocol Detection**: Dynamic adaptation to different deployments
- **Season-Based Synchronization**: Time-period coordination across subgraphs

### Chain-Specific Features

- **Ethereum**: Complete DeFi suite with unripe assets and fertilizer
- **Base**: Multi-asset LP pools with simplified gauge system
- **Arbitrum**: L2 scaling with L1 migration tracking

## Development Guidelines

### Handler Organization

- Current events reference the latest protocol ABI (no version numbers)
- Legacy events reference the specific upgrade ABI and include version numbers
- Place legacy handlers in `legacy/` folders
- Separate business logic into `utils/` files for reusability

### Graph-cli

Commands requiring manifest files should specify `./manifests/{chain}.yaml`. Examples are provided in `package.json` scripts.

### File Structure

- `src/subgraphs/{name}/manifests/` - Chain-specific deployment configs
- `src/subgraphs/{name}/src/entities/` - GraphQL entity definitions
- `src/subgraphs/{name}/src/handlers/` - Event processing logic
- `src/subgraphs/{name}/src/utils/` - Business logic utilities
- `src/subgraphs/{name}/tests/` - Unit tests and mocking utilities

## Data Flow

The protocol operates on "seasons" (time periods), with cross-subgraph coordination:

- Season events trigger updates across all subgraphs
- Coordinated snapshot generation for analytics

The subgraphs work together to provide complete protocol visibility:

- Users trade through Wells (Basin subgraph)
- Silo and Field interactions (Beanstalk subgraph)
- Bean price discovery across multiple pools (Bean subgraph)
- NFT rewards track participation (BeanFT subgraph)

### Files to avoid

- Only develop new changes for `pinto`, do not develop for `ethereum` or `arbitrum`
- Do not modify NFT project
- Do not modify L1->L2 migration or use the `yarn build-cache` script
