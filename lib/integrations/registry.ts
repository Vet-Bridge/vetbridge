import { ezyvetConnector } from "./ezyvet/ezyvetConnector";
import { smartflowConnector } from "./smartflow/smartflowConnector";
import type { ExternalSystem, IntegrationConnector } from "./shared/types";

const connectorRegistry = new Map<ExternalSystem, IntegrationConnector>([
  ["ezyVet", ezyvetConnector],
  ["SmartFlow", smartflowConnector],
]);

export const getIntegrationConnector = (externalSystem: ExternalSystem) =>
  connectorRegistry.get(externalSystem) || null;

export const listIntegrationConnectors = () => Array.from(connectorRegistry.values());
