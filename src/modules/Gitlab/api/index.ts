const gitlabUrl = process.env.GITLAB_URL;
const accessToken = process.env.GITLAB_TOKEN;
const projectId = process.env.GITLAB_PROJECT_ID;

export async function getProjects() {
  const response = await fetch(`${gitlabUrl}/projects`, {
  headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}

export async function createProject(projectName: string) {
  const response = await fetch(`${gitlabUrl}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ name: projectName })
  });
  return response.json();
}

export async function deleteProject(projectId: string) {
  const response = await fetch(`${gitlabUrl}/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}

export async function createBranch(branchName: string, ref: string) {
  const response = await fetch(`${gitlabUrl}/projects/${projectId}/repository/branches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ branch: branchName, ref: ref })
  });
  return response.json();
}

export async function commitFile(branchName: string, filePath: string, content: string) {
  const response = await fetch(`${gitlabUrl}/projects/${projectId}/repository/commits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ branch: branchName, commit_message: `Adding ${filePath}`, actions: [ { action: `create`, file_path: `${filePath}`, content: content} ] })
  });
  return response.json();
}

export async function updateFile(branchName: string, filePath: string, content: string) {
  const response = await fetch(`${gitlabUrl}/projects/${projectId}/repository/commits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ branch: branchName, commit_message: `Updating ${filePath}`, actions: [ { action: `update`, file_path: `${filePath}`, content: content} ] })
  });
  return response.json();
}

export async function createPullRequest(sourceBranch: string, targetBranch: string, title: string, description: string) {
  const response = await fetch(`${gitlabUrl}/projects/${projectId}/merge_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json,',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ source_branch: sourceBranch, target_branch: targetBranch, title, description })
  });
  return response.json();
}

export async function getFileContentRaw(branchName: string, filePath: string) {
  const response = await fetch(`${gitlabUrl}/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}/raw?ref=${branchName}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (response.ok) {
    return response.text();
  } else {
    return null;
  }
}

export async function getCommitInfo(commitId: string, sourceProjectId: string) {
  const response = await fetch(`${gitlabUrl}/projects/${sourceProjectId}/repository/commits/${commitId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (response.ok) {
    return response.json();
  } else {
    return null;
  }
}

export async function getProjectId(repositoryPath: string) {
    const url = `${gitlabUrl}/projects/${encodeURIComponent(repositoryPath)}`;
    const headers = {
    };

    try {
        const response = await fetch(url, { headers });
        if (response.ok) {
            const projectData = await response.json();
            return projectData.id;
        } else {
            console.error(`Failed to retrieve project details: ${response.status} - ${response.statusText}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching project details:', error);
        return null;
    }
}

export async function getModifiedFilesInCommit(commitId: string, sourceProjectId: string) {
    const url = `${gitlabUrl}/projects/${sourceProjectId}/repository/commits/${commitId}/diff`;
    const headers = {
    };

    try {
        const response = await fetch(url, { headers });
        if (response.ok) {
            const commitData = await response.json();
            return commitData;
        } else {
            console.error(`Failed to retrieve commit details: ${response.status} - ${response.statusText}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching commit details:', error);
        return null;
    }
}
