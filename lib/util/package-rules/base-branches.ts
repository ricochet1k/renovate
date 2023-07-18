import is from '@sindresorhus/is';
import type { PackageRule, PackageRuleInputConfig } from '../../config/types';
import { configRegexPredicate } from '../regex';
import { Matcher } from './base';

export class BaseBranchesMatcher extends Matcher {
  override matches(
    { baseBranch }: PackageRuleInputConfig,
    { matchBaseBranches }: PackageRule
  ): object | boolean | null {
    if (is.undefined(matchBaseBranches)) {
      return null;
    }

    if (is.undefined(baseBranch)) {
      return false;
    }

    for (const matchBaseBranch of matchBaseBranches) {
      const isAllowedPred = configRegexPredicate(matchBaseBranch);
      if (isAllowedPred) {
        const match = isAllowedPred(baseBranch);
        if (match) {
          return match;
        }
      }
      if (matchBaseBranch === baseBranch) {
        return true;
      }
    }
    return false;
  }
}
