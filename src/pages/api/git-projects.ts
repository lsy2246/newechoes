import type { APIContext } from 'astro';
import { Octokit } from 'octokit';
import fetch from 'node-fetch';
import { GitPlatform } from '@/components/GitProjectCollection';

interface GitProject {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  updatedAt: string;
  owner: string;
  avatarUrl: string;
  platform: GitPlatform;
}

interface Pagination {
  current: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const prerender = false;

export async function GET({ request }: APIContext) {
  try {
    const url = new URL(request.url);
    
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    const platformParam = url.searchParams.get('platform');
    const page = parseInt(url.searchParams.get('page') || '1');
    const username = url.searchParams.get('username') || '';
    const organization = url.searchParams.get('organization') || '';
    const configStr = url.searchParams.get('config');

    if (!platformParam) {
      return new Response(JSON.stringify({ 
        error: '无效的平台参数',
        receivedPlatform: platformParam,
      }), { status: 400, headers });
    }

    if (!configStr) {
      return new Response(JSON.stringify({ 
        error: '缺少配置参数'
      }), { status: 400, headers });
    }

    const config = JSON.parse(configStr);

    if (!Object.values(GitPlatform).includes(platformParam as GitPlatform)) {
      return new Response(JSON.stringify({ 
        error: '无效的平台参数',
        receivedPlatform: platformParam,
      }), { status: 400, headers });
    }
    
    const platform = platformParam as GitPlatform;
    let projects: GitProject[] = [];
    let pagination: Pagination = { current: page, total: 1, hasNext: false, hasPrev: page > 1 };
    
    if (platform === GitPlatform.GITHUB) {
      const result = await fetchGithubProjects(username, organization, page, config);
      projects = result.projects;
      pagination = result.pagination;
    } else if (platform === GitPlatform.GITEA) {
      const result = await fetchGiteaProjects(username, organization, page, config);
      projects = result.projects;
      pagination = result.pagination;
    } else if (platform === GitPlatform.GITEE) {
      const result = await fetchGiteeProjects(username, organization, page, config);
      projects = result.projects;
      pagination = result.pagination;
    }
    
    return new Response(JSON.stringify({ projects, pagination }), {
      status: 200,
      headers
    });
  } catch (error) {
    // 检查是否为请求中止错误
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      return new Response(JSON.stringify({ 
        error: '请求被用户中止',
        message: error.message,
        type: 'abort'
      }), {
        status: 499, // 使用 499 状态码表示客户端关闭请求
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 处理其他类型的错误
    return new Response(JSON.stringify({ 
      error: '处理请求错误',
      message: error instanceof Error ? error.message : '未知错误',
      type: 'server'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// 使用带超时和重试的 fetch 函数
async function fetchWithRetry(url: string, options: any, retries = 3, timeout = 10000) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      
      // 如果原始请求已有 signal，保持追踪以便正确处理用户中止
      const originalSignal = options?.signal;
      
      // 设置超时定时器
      const timeoutId = setTimeout(() => {
        controller.abort(`请求超时 (${timeout}ms)`);
      }, timeout);
      
      // 添加超时的 signal 到请求选项
      const fetchOptions = {
        ...options,
        signal: controller.signal
      };
      
      // 如果有原始信号，监听其中止事件以便同步中止
      if (originalSignal) {
        if (originalSignal.aborted) {
          // 如果原始信号已经被中止，立即中止当前请求
          controller.abort('用户取消请求');
          clearTimeout(timeoutId);
          throw new Error('用户取消请求');
        }
        
        // 监听原始信号的中止事件
        const abortHandler = () => {
          controller.abort('用户取消请求');
          clearTimeout(timeoutId);
        };
        
        originalSignal.addEventListener('abort', abortHandler);
        
        // 确保在操作完成后清理事件监听器
        setTimeout(() => {
          try {
            originalSignal.removeEventListener('abort', abortHandler);
          } catch (e) {
            // 忽略可能出现的清理错误
          }
        }, 0);
      }
      
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // 检查是否为中止错误
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          // 确定中止原因 - 是超时还是用户请求
          const isTimeout = error.message.includes('timeout') || error.message.includes('超时');
          
          if (isTimeout && attempt < retries - 1) {
            // 如果是超时且还有重试次数，继续重试
            console.log(`请求超时，正在重试 (${attempt + 1}/${retries})...`);
            lastError = error;
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          } else if (!isTimeout) {
            // 如果是用户主动中止，直接抛出错误
            throw error;
          }
        }
        
        // 其他错误情况
        lastError = error as Error;
        
        // 增加重试间隔
        if (attempt < retries - 1) {
          console.log(`请求失败，正在重试 (${attempt + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        throw lastError;
      }
    } catch (error) {
      lastError = error as Error;
      
      // 如果是中止错误，直接抛出不再重试
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        throw error;
      }
      
      // 最后一次尝试失败
      if (attempt === retries - 1) {
        throw lastError;
      }
    }
  }
  
  // 所有重试都失败了
  throw lastError || new Error('所有重试请求都失败了');
}

async function fetchGithubProjects(username: string, organization: string, page: number, config: any) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
        request: {
          timeout: 10000
        }
      });
      
      const perPage = config.perPage || 10;
      let repos;
      
      if (organization) {
        const { data } = await octokit.request('GET /orgs/{org}/repos', {
          org: organization,
          per_page: perPage,
          page: page,
          sort: 'updated',
          direction: 'desc'
        });
        repos = data;
      } else if (username) {
        const { data } = await octokit.request('GET /users/{username}/repos', {
          username: username,
          per_page: perPage,
          page: page,
          sort: 'updated',
          direction: 'desc'
        });
        repos = data;
      } else {
        const { data } = await octokit.request('GET /users/{username}/repos', {
          username: config.username,
          per_page: perPage,
          page: page,
          sort: 'updated',
          direction: 'desc'
        });
        repos = data;
      }
      
      let hasNext = false;
      let hasPrev = page > 1;
      let totalPages = 1;
      
      if (repos.length === perPage) {
        hasNext = true;
        totalPages = page + 1;
      }
      
      if (repos.length > 0 && repos[0].owner) {
        hasNext = repos.length === perPage;
        totalPages = hasNext ? page + 1 : page;
      }
      
      const projects = repos.map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        owner: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
        platform: GitPlatform.GITHUB
      }));
      
      return {
        projects,
        pagination: {
          current: page,
          total: totalPages,
          hasNext,
          hasPrev
        }
      };
    } catch (error) {
      // 检查是否为中止错误
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        throw error; // 中止错误直接抛出，不重试
      }
      
      retryCount++;
      
      if (retryCount >= maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
    }
  }
  
  return {
    projects: [],
    pagination: {
      current: page,
      total: 1,
      hasNext: false,
      hasPrev: page > 1
    }
  };
}

async function fetchGiteaProjects(username: string, organization: string, page: number, config: any) {
  try {
    const perPage = config.perPage || 10;
    const giteaUrl = config.url;
    const signal = config.signal; // 获取可能的 AbortSignal
    
    if (!giteaUrl) {
      throw new Error('Gitea URL 不存在');
    }
    
    let apiUrl;
    if (organization) {
      apiUrl = `${giteaUrl}/api/v1/orgs/${organization}/repos?page=${page}&per_page=${perPage}`;
    } else if (username) {
      apiUrl = `${giteaUrl}/api/v1/users/${username}/repos?page=${page}&per_page=${perPage}`;
    } else {
      apiUrl = `${giteaUrl}/api/v1/users/${config.username}/repos?page=${page}&per_page=${perPage}`;
    }
    
    const response = await fetchWithRetry(apiUrl, {
      headers: {
        'Accept': 'application/json',
        ...(config.token ? { 'Authorization': `token ${config.token}` } : {})
      },
      signal // 传递 AbortSignal
    }, 3, 15000); // 最多重试3次，每次超时15秒
    
    if (!response.ok) {
      throw new Error(`Gitea API 请求失败: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    
    const repos = Array.isArray(data) ? data : [];
    
    const totalCount = parseInt(response.headers.get('X-Total-Count') || '0');
    const totalPages = Math.ceil(totalCount / perPage) || 1;
    
    const projects = repos.map((repo: any) => ({
      name: repo.name,
      description: repo.description || '',
      url: repo.html_url || `${giteaUrl}/${repo.full_name || `${repo.owner.username || repo.owner.login}/${repo.name}`}`,
      stars: repo.stars_count || repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language || '',
      updatedAt: repo.updated_at,
      owner: repo.owner.username || repo.owner.login,
      avatarUrl: repo.owner.avatar_url,
      platform: GitPlatform.GITEA
    }));
    
    return {
      projects,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    // 检查是否为中止错误，将其向上传播
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw error;
    }
    
    console.error('获取 Gitea 项目失败:', error);
    
    return {
      projects: [],
      pagination: {
        current: page,
        total: 1,
        hasNext: false,
        hasPrev: page > 1
      }
    };
  }
}

async function fetchGiteeProjects(username: string, organization: string, page: number, config: any) {
  try {
    const perPage = config.perPage || 10;
    const signal = config.signal; // 获取可能的 AbortSignal
    
    const giteeUsername = username || config.username;
    
    if (!giteeUsername) {
      throw new Error('Gitee 用户名未配置');
    }
    
    let apiUrl;
    if (organization) {
      apiUrl = `https://gitee.com/api/v5/orgs/${organization}/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`;
    } else {
      apiUrl = `https://gitee.com/api/v5/users/${giteeUsername}/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`;
    }
    
    if (config.token) {
      apiUrl += `&access_token=${config.token}`;
    }
    
    const response = await fetchWithRetry(apiUrl, {
      signal // 传递 AbortSignal
    }, 3, 15000); // 最多重试3次，每次超时15秒
    
    if (!response.ok) {
      throw new Error(`Gitee API 请求失败: ${response.statusText}`);
    }
    
    const data = await response.json() as any[];
    
    const projects: GitProject[] = data.map(repo => ({
      name: repo.name || '',
      description: repo.description || '',
      url: repo.html_url || '',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language || '',
      updatedAt: repo.updated_at || '',
      owner: repo.owner?.login || '',
      avatarUrl: repo.owner?.avatar_url || '',
      platform: GitPlatform.GITEE
    }));
    
    const totalCount = parseInt(response.headers.get('total_count') || '0');
    const totalPages = Math.ceil(totalCount / perPage) || 1;
    
    return {
      projects,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    // 检查是否为中止错误，将其向上传播
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw error;
    }
    
    console.error('获取 Gitee 项目失败:', error);
    
    return {
      projects: [],
      pagination: {
        current: page,
        total: 1,
        hasNext: false,
        hasPrev: page > 1
      }
    };
  }
}