import { useState, useEffect } from 'react';
import GitHub from '@/lib/utils/github';
import { Octokit } from '@octokit/rest';
import styles from '@/styles/app.module.css';
import repos from '../../data/repos.json';

export default function Leaderboard() {
  const [repoData, setRepoData] = useState([]);
  const [sortBy, setSortBy] = useState('stars');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRepo, setExpandedRepo] = useState(null);

  useEffect(() => {
    fetchRepoData();
  }, []);

  const fetchRepoData = async () => {
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      const github = new GitHub(octokit);
      const repoPromises = repos.map(async (repoUrl) => {
        const repo = await github.getRepoByUrl(repoUrl);
        let fundingJson = null;
        try {
          await github.verifyFundingJson(repo.owner.login, repo.name);
          const { data } = await octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: 'FUNDING.json',
          });
          fundingJson = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
        } catch (error) {
          console.error(`Error fetching FUNDING.json for ${repo.full_name}:`, error);
        }
        return { ...repo, fundingJson };
      });
      const repoData = await Promise.all(repoPromises);
      setRepoData(repoData);
    } catch (error) {
      console.error('Error fetching repo data:', error);
    }
  };

  const sortedRepos = [...repoData].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleExpandRepo = (repoId) => {
    setExpandedRepo(expandedRepo === repoId ? null : repoId);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1>Repository Leaderboard</h1>
        <table className={styles.leaderboardTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th onClick={() => handleSort('stargazers_count')} className={styles.sortable}>
                Stars {sortBy === 'stargazers_count' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th onClick={() => handleSort('forks_count')} className={styles.sortable}>
                Forks {sortBy === 'forks_count' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th>FUNDING.json</th>
            </tr>
          </thead>
          <tbody>
            {sortedRepos.map((repo) => (
              <>
                <tr key={repo.id}>
                  <td>{repo.full_name}</td>
                  <td>{repo.stargazers_count}</td>
                  <td>{repo.forks_count}</td>
                  <td>
                    {repo.fundingJson ? (
                      <button onClick={() => toggleExpandRepo(repo.id)}>
                        {expandedRepo === repo.id ? 'Hide' : 'Show'}
                      </button>
                    ) : (
                      'N/A'
                    )}
                  </td>
                </tr>
                {expandedRepo === repo.id && (
                  <tr>
                    <td colSpan="4">
                      <pre className={styles.fundingJson}>
                        {JSON.stringify(repo.fundingJson, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
