import is from '@sindresorhus/is';
import slugify from 'slugify';
import { mergeChildConfig } from '../../config';
import type { PackageRule, PackageRuleInputConfig } from '../../config/types';
import { logger } from '../../logger';
import * as template from '../template';
import matchers from './matchers';
import { matcherOR } from './utils';

function matchesRule(
  inputConfig: PackageRuleInputConfig,
  packageRule: PackageRule
): object | boolean {
  // excludes
  for (const groupExcludes of matchers) {
    const isExclude = matcherOR(
      'excludes',
      groupExcludes,
      inputConfig,
      packageRule
    );

    // no rules are defined
    if (is.nullOrUndefined(isExclude)) {
      continue;
    }

    if (isExclude) {
      return false;
    }
  }

  let matched: { [k: string]: any } | boolean = true;

  // matches
  for (const groupMatchers of matchers) {
    const isMatch = matcherOR(
      'matches',
      groupMatchers,
      inputConfig,
      packageRule
    );

    // no rules are defined
    if (is.nullOrUndefined(isMatch)) {
      continue;
    }

    if (!is.truthy(isMatch)) {
      return false;
    }

    if (is.object(isMatch)) {
      if (is.object(matched)) {
        matched = { ...(matched as object), ...isMatch };
      } else {
        matched = { ...isMatch };
      }
    }
  }

  return matched;
}

export function applyPackageRules<T extends PackageRuleInputConfig>(
  inputConfig: T
): T {
  let config = { ...inputConfig };
  const packageRules = config.packageRules ?? [];
  logger.trace(
    { dependency: config.depName, packageRules },
    `Checking against ${packageRules.length} packageRules`
  );
  for (const packageRule of packageRules) {
    // This rule is considered matched if there was at least one positive match and no negative matches
    const matches = matchesRule(config, packageRule);
    if (matches) {
      // Package rule config overrides any existing config
      const toApply = { ...packageRule };
      for (const [key, valueTemplate] of Object.entries(
        toApply.templates ?? {}
      )) {
        const value = template.compile(valueTemplate, {
          ...config,
          ...(matches as object),
        });
        toApply[key] = value;
        // logger.debug(
        //   { dependency: config.depName, key, value, toApply },
        //   `Applying template`
        // );
      }
      delete toApply.templates;
      if (config.groupSlug && toApply.groupName && !toApply.groupSlug) {
        // Need to apply groupSlug otherwise the existing one will take precedence
        toApply.groupSlug = slugify(toApply.groupName, {
          lower: true,
        });
      }
      config = mergeChildConfig(config, toApply);
      delete config.matchPackageNames;
      delete config.matchPackagePatterns;
      delete config.matchPackagePrefixes;
      delete config.excludePackageNames;
      delete config.excludePackagePatterns;
      delete config.excludePackagePrefixes;
      delete config.matchDepTypes;
      delete config.matchCurrentValue;
      delete config.matchCurrentVersion;
      delete config.matchUpdateTypes;
    }
  }
  return config;
}
