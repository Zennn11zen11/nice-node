import type { TFunction } from 'i18next';
import type { ReactElement } from 'react';
import type {
  CpuRequirements,
  // DockerRequirements,
  InternetRequirements,
  MemoryRequirements,
  StorageRequirements,
} from '../../../common/systemRequirements';

import type { ChecklistItemProps } from '../../Generics/redesign/Checklist/ChecklistItem';
import ExternalLink from '../../Generics/redesign/Link/ExternalLink';
import { bytesToGB } from '../../utils';
import type { NodeRequirementsProps } from './NodeRequirements';
import { findSystemStorageDetailsAtALocation } from './nodeStorageUtil';

const isVersionHigher = (currentVersion: string, targetVersion: string) => {
  const parseVersion = (version: string) => version.split('.').map(Number);

  const current = parseVersion(currentVersion);
  const target = parseVersion(targetVersion);

  for (let i = 0; i < Math.max(current.length, target.length); i++) {
    const currentPart = current[i] || 0;
    const targetPart = target[i] || 0;
    if (currentPart > targetPart) return true;
    if (currentPart < targetPart) return false;
  }
  return false;
};

const TARGET_MACOS_VERSION = '13.0.0';

export const makeCheckList = (
  { nodeRequirements, systemData, nodeStorageLocation }: NodeRequirementsProps,
  t: TFunction,
) => {
  const newChecklistItems: ChecklistItemProps[] = [];
  if (!nodeRequirements) {
    return newChecklistItems;
  }

  let nodeLocationStorageDetails;
  if (systemData && nodeStorageLocation) {
    nodeLocationStorageDetails = findSystemStorageDetailsAtALocation(
      systemData,
      nodeStorageLocation,
    );
  }
  console.log('nodeLocationStorageDetails', nodeLocationStorageDetails);

  if (systemData?.os?.platform === 'darwin') {
    const checkListItem: ChecklistItemProps = {
      checkTitle: t('macOSTitle', {
        minVersion: TARGET_MACOS_VERSION,
      }),
      valueText: t('macOSDescription', {
        version: systemData?.os?.release,
      }),
      status: '',
    };
    if (isVersionHigher(systemData?.os?.release, TARGET_MACOS_VERSION)) {
      checkListItem.status = 'complete';
    } else {
      checkListItem.status = 'error';
    }
    newChecklistItems.push(checkListItem);
  }
  for (const [nodeReqKey, nodeReqValue] of Object.entries(nodeRequirements)) {
    console.log(`${nodeReqKey}: ${nodeReqValue}`);
    if (nodeReqKey === 'documentationUrl' || nodeReqKey === 'description') {
      continue;
    }
    // title and desc depends on req type
    // title and desc depends on whether the req is met or not
    // if cpu, if cores meets, add success
    //    if minSpeed doesn't meet
    let checkTitle = '';
    let valueText = '';
    let valueComponent: ReactElement = <></>;
    const captionText = '';
    let status: ChecklistItemProps['status'] = 'loading';
    if (nodeReqKey === 'cpu') {
      const req = nodeReqValue as CpuRequirements;
      if (req.cores !== undefined) {
        checkTitle = t('processorCoresTitle', {
          minCores: req.cores,
        });
        if (systemData?.cpu?.cores) {
          valueText = t('processorCoresDescription', {
            cores: systemData?.cpu.cores,
          });
          if (systemData?.cpu.cores >= req.cores) {
            status = 'complete';
          } else {
            status = 'incomplete';
          }
        } else {
          status = 'error';
        }
      }
    }
    if (nodeReqKey === 'memory') {
      const req = nodeReqValue as MemoryRequirements;
      if (req.minSizeGBs !== undefined) {
        checkTitle = t('memorySizeTitle', {
          minSize: req.minSizeGBs,
        });
        if (systemData?.memLayout[0]?.size) {
          valueText = t('memorySizeDescription', {
            size: bytesToGB(systemData?.memLayout[0]?.size),
          });
          if (systemData?.memLayout[0]?.size >= req.minSizeGBs) {
            status = 'complete';
          } else {
            status = 'incomplete';
          }
        } else {
          status = 'error';
        }
      }
    }
    if (nodeReqKey === 'storage') {
      const req = nodeReqValue as StorageRequirements;
      const disk = nodeLocationStorageDetails;
      if (req.ssdRequired === true) {
        checkTitle = t('storageTypeTitle', {
          type: 'SSD',
        });
        if (disk?.type || disk?.name) {
          if (disk?.type.includes('NVMe') || disk?.name.includes('NVMe')) {
            valueText = t('storageTypeDescription', {
              type: disk?.type ? disk?.type : 'NVMe SSD',
            });
            status = 'complete';
          } else if (disk?.type.includes('SSD') || disk?.name.includes('SSD')) {
            valueText = t('storageTypeDescription', {
              type: disk?.type ? disk?.type : 'SSD',
            });
            status = 'complete';
          } else if (disk?.type.includes('HDD') || disk?.name.includes('HDD')) {
            valueText = t('storageTypeDescription', {
              type: disk?.type ? disk?.type : 'HDD',
            });
            status = 'error';
          } else {
            status = 'incomplete';
          }
        } else {
          status = 'error';
        }
        const checkListItem: ChecklistItemProps = {
          checkTitle,
          valueText,
          status,
        };
        newChecklistItems.push(checkListItem);
      }
      if (req.minSizeGBs !== undefined) {
        checkTitle = t('storageSizeTitle', {
          minSize: req.minSizeGBs,
        });
        if (disk?.freeSpaceGBs) {
          const diskSizeGbs = Math.round(disk.freeSpaceGBs);
          // todo: use free space for storage calculations?
          valueText = t('storageSizeDescription', {
            freeSize: diskSizeGbs,
            storageName: disk.name,
          });
          if (diskSizeGbs >= req.minSizeGBs) {
            status = 'complete';
          } else {
            status = 'incomplete';
          }
        } else {
          status = 'error';
        }
      }
    }
    if (nodeReqKey === 'internet') {
      const req = nodeReqValue as InternetRequirements;
      if (req.minDownloadSpeedMbps !== undefined) {
        checkTitle = t('internetSpeedTitle', {
          minDownloadSpeed: req.minDownloadSpeedMbps,
          minUploadSpeed: req.minUploadSpeedMbps,
        });
        valueText = t('internetSpeedPleaseTest');
        valueComponent = (
          <>
            {`${t('internetSpeedTestWebsites')} `}
            <ExternalLink
              text={t('internetSpeedGoogleSpeedTest')}
              url="https://www.google.com/search?q=speed+test"
              inline
            />{' '}
            or{' '}
            <ExternalLink
              text={t('internetSpeedOoklaSpeedTest')}
              url="https://speedtest.net"
              inline
            />
          </>
        );
        status = 'information';
      }
    }
    // Todoo: Don't make user think about Podman?
    // if (nodeReqKey === 'docker') {
    //   const req = nodeReqValue as DockerRequirements;
    //   if (req.required === true) {
    //     captionText = t('dockerCaption');
    //     if (req.minVersion) {
    //       checkTitle = t('dockerVersionInstalledTitle', {
    //         minVersion: req.minVersion,
    //       });
    //     } else {
    //       // case where no specific docker version is required
    //       checkTitle = t('dockerInstalledTitle');
    //     }
    //     if (systemData?.versions.docker) {
    //       // !req.minVersion: case where no specific docker version is required
    //       if (
    //         !req.minVersion ||
    //         systemData?.versions.docker >= req.minVersion
    //       ) {
    //         valueText = t('dockerVersionInstalledDescription', {
    //           version: systemData?.versions.docker,
    //         });
    //         status = 'complete';
    //       } else {
    //         captionText = t('dockerVersionInstalledNeedsUpdateCaption');
    //         status = 'incomplete';
    //       }
    //     } else {
    //       valueText = t('dockerNotInstalledDescription', {
    //         version: systemData?.versions.docker,
    //       });
    //       status = 'incomplete';
    //     }
    //   }
    // }

    const checkListItem: ChecklistItemProps = {
      checkTitle,
      valueText,
      valueComponent,
      captionText,
      status,
    };
    newChecklistItems.push(checkListItem);
  }
  return newChecklistItems;
};
