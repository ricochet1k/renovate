import is from '@sindresorhus/is';
import type { PackageRule, PackageRuleInputConfig } from '../../config/types';
import { logger } from '../../logger';
import { regEx } from '../regex';
import { Matcher } from './base';
import { massagePattern } from './utils';

function matchPatternsAgainstName(
  matchPackagePatterns: string[],
  name: string
): object | boolean {
  for (const packagePattern of matchPackagePatterns) {
    const match = isPackagePatternMatch(packagePattern, name);
    if (match) {
      return match;
    }
  }
  return false;
}

export class PackagePatternsMatcher extends Matcher {
  override matches(
    { depName, packageName }: PackageRuleInputConfig,
    packageRule: PackageRule
  ): object | boolean | null {
    const { matchPackagePatterns } = packageRule;
    if (is.undefined(matchPackagePatterns)) {
      return null;
    }

    if (is.undefined(depName)) {
      return false;
    }

    if (is.string(packageName)) {
      const match = matchPatternsAgainstName(matchPackagePatterns, packageName);
      if (match) {
        return match;
      }
    }
    if (matchPatternsAgainstName(matchPackagePatterns, depName)) {
      logger.once.info(
        { packageRule, packageName, depName },
        'Use matchDepPatterns instead of matchPackagePatterns'
      );
      return true;
    }

    return false;
  }

  override excludes(
    { depName }: PackageRuleInputConfig,
    { excludePackagePatterns }: PackageRule
  ): boolean | null {
    // ignore lockFileMaintenance for backwards compatibility
    if (is.undefined(excludePackagePatterns)) {
      return null;
    }
    if (is.undefined(depName)) {
      return false;
    }

    for (const pattern of excludePackagePatterns) {
      const packageRegex = regEx(massagePattern(pattern));
      if (packageRegex.test(depName)) {
        logger.trace(`${depName} matches against ${String(packageRegex)}`);
        return true;
      }
    }
    return false;
  }
}

function isPackagePatternMatch(
  pckPattern: string,
  pck: string
): object | boolean {
  const re = regEx(massagePattern(pckPattern));
  const match = pck.match(re);
  if (match) {
    logger.trace(`${pck} matches against ${String(re)}`);
    return match;
  }
  return false;
}
