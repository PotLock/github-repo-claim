import type { Octokit } from '@octokit/rest';
import { Buffer } from 'buffer';

const ACCOUNT_ID_REGEX = /^(([a-z\d]+[-])[a-z\d]+.)([a-z\d]+[-])*[a-z\d]+$/;

/**
 * Validates the Account ID according to the NEAR protocol Account ID rules.
 * @param accountId - The Account ID string you want to validate.
 */
export function validNEARAccount(accountId: string): boolean { // Changed function name
  return (
    accountId.length >= 2 &&
    accountId.length <= 64 &&
    ACCOUNT_ID_REGEX.test(accountId)
  );
}

export default class GitHub {
  private octokit: Octokit;

  constructor(octokit: Octokit) {
    this.octokit = octokit;
  }

  public async getRepoByOwnerAndName(owner: string, repo: string) {
    const { data } = await this.octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
    });

    return data;
  }

  public async getRepoByUrl(repoUrl: string) {
    const url = new URL(repoUrl);

    if (url.host !== 'github.com') {
      throw new Error(`Invalid host: ${url.host}`);
    }

    const [, owner, repo] = url.pathname.split('/');

    return this.getRepoByOwnerAndName(owner, repo);
  }

  public async verifyFundingJson(owner: string, repo: string): Promise<void> {
    const { data } = await this.octokit.repos
      .getContent({
        owner,
        repo,
        path: 'FUNDING.json',
        request: {
          cache: 'reload',
        },
      })
      .catch(() => {
        throw new Error('FUNDING.json not found.');
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileContent = Buffer.from((data as any).content, 'base64').toString('utf-8');

    let fundingJson;
    try {
      fundingJson = JSON.parse(fileContent);
    } catch (error) {
      throw new Error('Invalid JSON format in FUNDING.json');
    }

    if (!fundingJson.potlock) {
      throw new Error('FUNDING.json is missing the "potlock" field');
    }

    if (!fundingJson.potlock.near) {
      throw new Error('FUNDING.json is missing the "near" field under "potlock"');
    }

    const nearAddress = fundingJson.potlock.near.ownedBy;
    try {
      if (!validNEARAccount(nearAddress)) { // Updated function call
        throw new Error('Invalid NEAR address format in FUNDING.json');
      }
    } catch (error) {
      throw new Error(error.message);
    }

    // If we reach this point, the FUNDING.json is valid
    console.log('FUNDING.json is valid');
  }
}
