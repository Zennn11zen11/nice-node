import arbitrumv1 from '../common/NodeSpecs/arbitrum/arbitrum-v1.0.0.json';
import basev1 from '../common/NodeSpecs/base/base-v1.0.0.json';
// Node Packages
import ethereumv1 from '../common/NodeSpecs/ethereum/ethereum-v1.0.0.json';
import farcasterv1 from '../common/NodeSpecs/farcaster/farcaster-v1.0.0.json';
import homeAssistantv1 from '../common/NodeSpecs/home-assistant/home-assistant-v1.0.0.json';
import minecraftv1 from '../common/NodeSpecs/minecraft/minecraft-v1.0.0.json';
import optimismv1 from '../common/NodeSpecs/optimism/optimism-v1.0.0.json';

// Node Services
import besuv1 from '../common/NodeSpecs/besu/besu-v1.0.0.json';
import erigonv1 from '../common/NodeSpecs/erigon/erigon-v1.0.0.json';
import gethv1 from '../common/NodeSpecs/geth/geth-v1.0.0.json';
import nethermindv1 from '../common/NodeSpecs/nethermind/nethermind-v1.0.0.json';
import rethv1 from '../common/NodeSpecs/reth/reth-v1.0.0.json';

import lighthousev1 from '../common/NodeSpecs/lighthouse/lighthouse-v1.0.0.json';
import lodestarv1 from '../common/NodeSpecs/lodestar/lodestar-v1.0.0.json';
import nimbusv1 from '../common/NodeSpecs/nimbus/nimbus-v1.0.0.json';
import prysmv1 from '../common/NodeSpecs/prysm/prysm-v1.0.0.json';
import tekuv1 from '../common/NodeSpecs/teku/teku-v1.0.0.json';

import pathfinderv1 from '../common/NodeSpecs/pathfinder/pathfinder-v1.0.0.json';

import hildrv1 from '../common/NodeSpecs/hildr/hildr-v1.0.0.json';
import magiv1 from '../common/NodeSpecs/magi/magi-v1.0.0.json';
import opGethv1 from '../common/NodeSpecs/op-geth/op-geth-v1.0.0.json';
import opNodev1 from '../common/NodeSpecs/op-node/op-node-v1.0.0.json';

import hubblev1 from '../common/NodeSpecs/hubble/hubble-v1.0.0.json';

import nitrov1 from '../common/NodeSpecs/nitro/nitro-v1.0.0.json';

import homeAssistantServicev1 from '../common/NodeSpecs/home-assistant-service/home-assistant-service-v1.0.0.json';
import itzgMinecraftv1 from '../common/NodeSpecs/itzg-minecraft/itzg-minecraft-v1.0.0.json';

import { injectDefaultControllerConfig } from '../common/node-spec-tool/injectDefaultControllerConfig.js';
import type { NodeId } from '../common/node.js';
import type Node from '../common/node.js';
import type {
  NodePackageSpecification,
  NodeSpecification,
  DockerExecution as PodmanExecution,
} from '../common/nodeSpec';
import { httpGetJson } from './httpReq.js';
import logger from './logger';
import {
  type NodeLibrary,
  type NodePackageLibrary,
  updateNodeLibrary,
  updateNodePackageLibrary,
} from './state/nodeLibrary';
import { getNode, updateNode } from './state/nodes.js';

// let controllerApiURL = `http://localhost:3000/api`;
let controllerApiURL = 'https://api.nicenode.xyz/api';
let isControllerApiHttp = false;
if (process.env.CONTROLLER_API_URL) {
  controllerApiURL = process.env.CONTROLLER_API_URL;
  console.log('controllerApiURL: ', controllerApiURL);
}
if (
  process.env.CONTROLLER_API_URL_IS_HTTP ||
  controllerApiURL.includes('localhost')
) {
  isControllerApiHttp = true;
}

export const initialize = async () => {
  await updateLocalNodeAndPackageLibrary();
};

// todo: use user defined url if available
const getControllerPackages = async (): Promise<NodeSpecification[]> => {
  const controllerPackagesApiURL = `${controllerApiURL}/controllerPackage`;
  const isHttp = isControllerApiHttp;
  const controllerPackages: NodeSpecification[] = (
    await httpGetJson(controllerPackagesApiURL, isHttp)
  ).data;
  // simple validation (only for nicenode api, not user defined api)
  const isEthereumPackageFound = controllerPackages.find(
    (spec) => spec.specId === 'ethereum',
  );
  if (!isEthereumPackageFound) {
    throw new Error(
      'Ethereum package not found in the controller packages API',
    );
  }
  return controllerPackages;
};

const getControllers = async (): Promise<NodeSpecification[]> => {
  const controllersApiURL = `${controllerApiURL}/controller`;
  const isHttp = isControllerApiHttp;
  const controllers: NodeSpecification[] = (
    await httpGetJson(controllersApiURL, isHttp)
  ).data;
  // simple validation (only for nicenode api, not user defined api)
  const isGethFound = controllers.find((spec) => spec.specId === 'geth');
  if (!isGethFound) {
    throw new Error('Geth controller not found in the controller packages API');
  }
  return controllers;
};

const getController = async (
  controllerId: string,
): Promise<NodeSpecification> => {
  const controllersApiURL = `${controllerApiURL}/controller/${controllerId}`;
  const isHttp = isControllerApiHttp;
  const response = await httpGetJson(controllersApiURL, isHttp);
  if (response.error) {
    throw Error(response.error);
  }
  const controller: NodeSpecification = response.data;
  return controller;
};

// Updates the local electron store with the latest node and package library (aka controllers)
// Should be called this after user clicks add node, but before showing the previous values
export const updateLocalNodeAndPackageLibrary = async () => {
  // parse spec json for latest versions
  // update the store with the latest versions
  // get specs from APIs, fallback to files

  let specs: NodeSpecification[] = [];
  let packageSpecs: NodeSpecification[] = [];
  try {
    const promises = [getControllerPackages(), getControllers()];
    // fetch in parallel
    const [controllerPackages, controllers] = await Promise.all(promises);
    logger.info(
      `controllerPackages from HTTP API: ${JSON.stringify(controllerPackages)}`,
    );
    logger.info(`controllers from HTTP API: ${JSON.stringify(controllers)}`);
    specs = controllers;
    packageSpecs = controllerPackages;
  } catch (e) {
    logger.error(e);
    logger.error(
      'Failed to fetch controllers from API, falling back to local files',
    );
    packageSpecs = [
      ethereumv1,
      farcasterv1,
      arbitrumv1,
      optimismv1,
      basev1,
      minecraftv1,
      homeAssistantv1,
    ];
    specs = [
      besuv1,
      nethermindv1,
      erigonv1,
      gethv1,
      rethv1,
      lodestarv1,
      nimbusv1,
      tekuv1,
      lighthousev1,
      prysmv1,
      arbitrumv1,
      nitrov1,
      pathfinderv1,
      opGethv1,
      opNodev1,
      hildrv1,
      magiv1,
      hubblev1,
      itzgMinecraftv1,
      homeAssistantServicev1,
    ];
  }
  const nodeSpecBySpecId: NodeLibrary = {};
  specs.forEach((spec) => {
    try {
      const nodeSpec: NodeSpecification = spec as NodeSpecification;
      if (nodeSpec.configTranslation === undefined) {
        nodeSpec.configTranslation = {};
      }

      // "inject" cliInput, serviceVersion, etc here. Universal for all nodes. dataDir (todo?)
      injectDefaultControllerConfig(nodeSpec);

      nodeSpecBySpecId[spec.specId] = nodeSpec;
    } catch (err) {
      logger.error(err);
    }
  });
  // console.log('nodeSpecBySpecId: ', nodeSpecBySpecId);
  updateNodeLibrary(nodeSpecBySpecId);

  const nodePackageSpecBySpecId: NodePackageLibrary = {};
  packageSpecs.forEach((spec) => {
    try {
      nodePackageSpecBySpecId[spec.specId] = spec as NodePackageSpecification;
    } catch (err) {
      logger.error(err);
    }
  });
  // console.log('nodePackageSpecBySpecId: ', nodePackageSpecBySpecId);

  return updateNodePackageLibrary(nodePackageSpecBySpecId);
};

/**
 *
 * @param nodeId
 * @returns latest controller if there is a new version, or undefined if
 * there is no update
 */
export const getCheckForControllerUpdate = async (
  nodeId: NodeId,
): Promise<NodeSpecification | undefined> => {
  // get node
  // using node.url, fetch the latest version
  // compare to node.spec.version
  // if newer, update node.updateAvailable = true
  const node: Node = getNode(nodeId);
  if (node) {
    const latestController: NodeSpecification = await getController(
      node.spec.specId,
    );
    logger.info(
      `getCheckForControllerUpdate: latestController: ${JSON.stringify(
        latestController,
      )}`,
    );
    if (node.spec.version < latestController.version) {
      logger.info(
        `getCheckForControllerUpdate: Node ${node.spec.displayName} has an update available`,
      );
      node.updateAvailable = true;
      updateNode(node);
      return latestController;
    }
    logger.info(
      `getCheckForControllerUpdate: Node ${node.spec.displayName} does NOT have an update available`,
    );
  } else {
    logger.error(`getCheckForControllerUpdate: Node ${nodeId} not found`);
  }
  node.updateAvailable = false;
  updateNode(node);
  return undefined; // throw
};
