import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react'

import CryptoJS from 'crypto-js'
import { Octokit } from 'octokit'
import { Link } from 'react-router'
import UploadTest from './components/UploadTest'
import { useSessionCache } from './utils/useSessionCache'


type Stats = {
  total: number         
  passing: number       
  failing: number        
  submissions: number    
}

const Admin: React.FC = () => {
  const secret = import.meta.env.VITE_SECRET_KEY
  const encryptedToken = localStorage.getItem('encryptedToken')

  // state
  const [octokit, setOctokit] = useState<Octokit | null>(null)
  const [user, setUser] = useState<any>(null)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'passing' | 'failing'>('all')
  const [tableClassroom, setTableClassroom] = useState("")
  const [tableAssignment, setTableAssignment] = useState("")
  const [loading, setLoading] = useState(true)
  const [tcToken ,setTcToken] = useState()
  const [nameSortAsc, setNameSortAsc] = useState<boolean | null>(null);
  const [gradeSortAsc, setGradeSortAsc] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | undefined>()
  const [forkSortAsc, setForkSortAsc] = useState<boolean | null>(null); // null = unsorted
  const [messageState, setMessageState] = useState("Test Data not available");
  const [globalStats, setGlobalStats] = useState<Stats>({
    total: 0, passing: 0, failing: 0, submissions: 0,
  })

  const [results, setResults] = useState<
    { url:any;  repo: string; passed: number; total: number; error?: string;}[]
  >([]);
  const section1Ref = useRef(null);


  useEffect(() => {
    // ① grab anything after '#'
    const hash = window.location.hash;               //  "#access_token=ghp_123..."
    if (!hash.startsWith('#access_token=')) return;

    const rawToken = decodeURIComponent(hash.split('=')[1]);

    // ② encrypt & stash
    if (rawToken && secret) {
      const cipher = CryptoJS.AES.encrypt(JSON.stringify(rawToken), secret)
                              .toString();
      localStorage.setItem('encryptedToken', cipher);
    }

    // ③ scrub it from the address-bar so it never appears again
    window.history.replaceState({}, '', window.location.pathname);
    
    // ④ let the rest of your app pick it up as usual
    setTcToken(rawToken);
    setOctokit(new Octokit({ auth: rawToken }));
  }, [secret]);


  useEffect(() => {
    if (!encryptedToken || !secret) return
    const bytes = CryptoJS.AES.decrypt(encryptedToken, secret)
    const token = bytes.toString(CryptoJS.enc.Utf8)
    setTcToken(JSON.parse(token));
    if (token) setOctokit(new Octokit({ auth: JSON.parse(token) }))
  }, [encryptedToken, secret])

  // fetch user & classrooms once octokit is ready
  useEffect(() => {
    setLoading(true)
    if (!octokit) return

    const fetchUser = async () => {
      const data = await useSessionCache(
        'gh:user', 
        () => octokit.request('GET /user').then(r => r.data)
      )
      setUser(data)
    }

    const fetchClassrooms = async () => {
      const cls = await useSessionCache(
        'gh:classrooms',
        () => octokit.request('GET /classrooms').then(r => r.data)
        )
      const withAssign = await Promise.all(
        cls.map(async (c: any) => {
          const { data: assignments } = await octokit.request(
            'GET /classrooms/{classroom_id}/assignments',
            { classroom_id: c.id }
          )
          return assignments.length ? { ...c, assignments } : null
        })
      )
      setClassrooms(withAssign.filter(Boolean))
       setLoading(false)
    }

    fetchUser()
    fetchClassrooms()
  }, [octokit])

  console.log(classrooms);
  

  /** 1 API call per repo, cached 10 min in sessionStorage */
  async function getForkedAt(
    octokit: Octokit,
    fullName: string            // "owner/repo"
  ): Promise<string> {
    return useSessionCache(
      `gh:meta:${fullName}`,
      async () => {
        const [owner, repo] = fullName.split("/");
        const { data } = await octokit.request(
          "GET /repos/{owner}/{repo}",
          { owner, repo }
        );
        return data.created_at;           // ISO-8601 string
      },
      10 * 60_000
    );
  }


  const fetchParticipants = async (assignment_id: number) => {
  section1Ref.current.scrollIntoView();
  if (!octokit) return;
  setTableLoading(true);

  const data = await useSessionCache(
    `gh:participants:${assignment_id}`,
    () =>
      octokit.request(
        "GET /assignments/{assignment_id}/accepted_assignments",
        { assignment_id, per_page: 100 }
      ).then(r => r.data),
    10 * 60_000
  );

  // ⚡ pull created_at for every repo (in parallel, with caching)
  const enriched = await Promise.all(
    data.map(async (p: any) => ({
      ...p,
      forkedAt: await getForkedAt(octokit, p.repository.full_name)
    }))
  );

  const sorted = enriched.sort((a: any, b: any) =>
    a.grade === "100/100" ? -1 :
    b.grade === "100/100" ? 1  :
    a.grade === "0/100"   ? -1 :
    b.grade === "0/100"   ? 1  : 0
  );

  setTableClassroom(sorted[0].assignment.classroom.name);
  setTableAssignment(sorted[0].assignment.title);
  setParticipants(sorted);
  console.log(sorted);
  setTableLoading(false);
  setFilter("all");
};

 

// 1) — run this once when the component mounts, so the UI shows cached numbers immediately
useEffect(() => {
  const cached = sessionStorage.getItem('globalStats');
  if (cached) setGlobalStats(JSON.parse(cached));
}, []);

// 2) — your existing function, now persisting the stats
const fetchAllStats = useCallback(async () => {
  if (!octokit || classrooms.length === 0) return;

  const ids = classrooms.flatMap((c: any) => c.assignments.map((a: any) => a.id));

  const uniqueAll  = new Set<string>();
  const uniquePass = new Set<string>();
  const uniqueFail = new Set<string>();
  const uniqueSub  = new Set<string>();

  await Promise.all(
    ids.map(async id => {
      const { data } = await octokit.request(
        'GET /assignments/{assignment_id}/accepted_assignments',
        { assignment_id: id, per_page: 100 }
      );

      data.forEach(p => {
        const login = p?.students?.[0]?.login;
        if (!login) return;

        uniqueAll.add(login);

        const g = parseInt(p.grade, 10);
        if (!Number.isNaN(g) && g > 0) {
          uniquePass.add(login);
          uniqueFail.delete(login);
        } else if (!uniquePass.has(login)) {
          uniqueFail.add(login);
        }

        if (p.submitted || (p.commit_count ?? 0) > 0) {
          uniqueSub.add(login);
        }
      });
    })
  );

  const stats = {
    total:       uniqueAll.size,
    passing:     uniquePass.size,
    failing:     uniqueFail.size,
    submissions: uniqueSub.size,
  };

  setGlobalStats(stats);                                // keep React state
  sessionStorage.setItem('globalStats', JSON.stringify(stats)); // <- **saves to session storage**
}, [octokit, classrooms]);


useEffect(() => {
  fetchAllStats()                  // ③ now fires whenever octokit or classrooms update
}, [fetchAllStats]) 





useEffect(() => {
  const firstAssignmentId = classrooms?.[0]?.assignments?.[0]?.id; 
  if (!octokit || !firstAssignmentId) return;

  fetchParticipants(firstAssignmentId);
}, [octokit, classrooms]);   


async function downloadRepo() {
  
  if (!file) {
    return alert("Please select a file first!");
  }
   setMessageState("test run pending")
  const winners = participants.filter(p => p.grade === "100/100");
  if (winners.length === 0) {
    return alert("No participants with 100/100 found.");
  }

  setResults([]);  // clear previous results


  for (const p of winners) {
    const form = new FormData();
    form.append("token", tcToken.toString());
    form.append("owner", p.repository.full_name.split("/")[0]);
    form.append("repo", p.repository.name);
    form.append("ref", p.repository.default_branch);
    form.append("file", file, file.name);
    

    try {
      const res = await fetch("http://localhost:3000/api/clone", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      const downloadUrl: string | undefined = json.downloadUrl;
    
      if (!json.success) {
        setResults(prev => [
          ...prev,
          {
            repo: p.repository.name,
            passed: 0,
            total: 0,
            error: json.error,
            url:downloadUrl,
          }
        ]);
        continue;
      }

      const m = json.testRes.last4Lines.match(
        /Tests:\s*(\d+)\s*passed,\s*(\d+)\s*total/
      );

      if (m) {
        const passed = Number(m[1]);
        const total = Number(m[2]);
        setResults(prev => [
          ...prev,
          {
            repo: p.repository.name,
            passed,
            total,
            url:downloadUrl,
          }
        ]);
      } else {
        setResults(prev => [
          ...prev,
          {
            repo: p.repository.name,
            passed: 0,
            total: 0,
            error: "Could not parse test output",
            url:downloadUrl,
          }
        ]);
      }
    } catch (err: any) {
      setResults(prev => [
        ...prev,
        {
          repo: p.repository.name,
          passed: 0,
          total: 0,
          error: err.message,
          url:undefined,
        }
      ]);
    }
  }
  
}

  // derive stats
  const totalCount = participants.length
  const passingCount = participants.filter(p => parseInt(p.grade, 10) > 0).length
  const failingCount = participants.filter(p => parseInt(p.grade, 10) === 0).length

  // apply filter
  const filtered = participants.filter(p => {
    if (filter === 'all') return true
    if (filter === 'passing') return parseInt(p.grade, 10) > 0
    if (filter === 'failing') return parseInt(p.grade, 10) === 0
    return true
  })

 function formatGithubLink(url) {
  const repoName = url.replace(/\/+$/, '').split('/').pop();
  const parts = repoName.split('-');
  if (parts.length < 2) return url;  
  const exercise = parts.slice(0, 2).join('-');
  const user = parts[parts.length - 1];
  return `[${exercise}...${user}]`;
}

function sortAgainstName() {
  const nextAsc = nameSortAsc === null ? true : !nameSortAsc;
  setNameSortAsc(nextAsc);

  const sorted = [...participants].sort((a, b) => {
    const cmp = a.students[0].login.localeCompare(b.students[0].login);
    return nextAsc ? cmp : -cmp;
  });
  setParticipants(sorted);
}

function sortAgainstGrade() {
  const nextAsc = gradeSortAsc === null ? false : !gradeSortAsc;
  setGradeSortAsc(nextAsc);

  const sorted = [...participants].sort((a, b) => {
    const gA = parseInt(a.grade, 10);
    const gB = parseInt(b.grade, 10);
    return nextAsc ? gA - gB : gB - gA;
  });
  setParticipants(sorted);
}

function sortAgainstForked() {

  const nextAsc = forkSortAsc === null ? false : !forkSortAsc;
  setForkSortAsc(nextAsc);
  const sorted = [...participants].sort((a, b) => {
    const tA = new Date(a.forkedAt ?? a.repository?.forked_at).getTime();
    const tB = new Date(b.forkedAt ?? b.repository?.forked_at).getTime();
    return nextAsc ? tA - tB : tB - tA;
  });
  setParticipants(sorted);
}

  return (
    
    <div className="px-12 mt-3 mb-12 font-sans">
      {/* user info */} 
      {user && (
        <a className='cursor-pointer' href={user.html_url} target="_blank" rel="noopener noreferrer">
        <div className="flex items-center space-x-4 mb-2">
          <img src={user.avatar_url} className="w-16 h-16 rounded-full" />
          <h2 className="text-3xl font-semibold">{user.name}</h2>
        </div>
        </a>  
      )}
       <div className='mb-4'>
          <h1 className='text-4xl font-semibold'>Active Classrooms</h1>
          <h2 className='text-lg text-gray-600 font-light'>Click on each assignment from the classroom to manage and analyse score</h2>
      </div>

  
      {/* classrooms + assignments */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {classrooms.map(c => (
          <div key={c.id} className="bg-[#1c1c1e] white- p-4 rounded-lg shadow border-b-[#f1760d] border-b-8">
            <h2 className=" text-white text-2xl font-semibold">
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {c.name}
              </a>
            </h2>
            {c.assignments.map((a: any) => (
            <div className='flex justify-between items-center' key={a.id}>
              <button
                key={a.id}
                className="mt-2 text-white cursor-pointer hover:text-[#f1760d]"
                onClick={() => fetchParticipants(a.id)}
              >
                {a.title}
              </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      
    <div className='flex flex-col rounded-md gap-2 mb-4'>
      <h1 className='text-4xl font-semibold'>Overall Stats</h1>
      <div className='flex gap-x-[20px]  '>
      <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Total Active Participants
        </span>
         <span className='text-5xl'>
         {globalStats.total ? globalStats.total : `...`}
         </span>
      </div>
          <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Total Passing
        </span>
         <span className='text-5xl'>
          {globalStats.passing ? globalStats.passing : `...`}
         </span>
      </div>
      <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Total Failing
        </span>
         <span className='text-5xl'>
          {globalStats.failing ? globalStats.failing : `...`}
         </span>
      </div>
        <div className="text-xl mb-4  border-amber-500 border-2 w-90 h-24 rounded-md p-2 flex flex-col">
        <span>
        Assignments Accepted
        </span>
         <span className='text-5xl'>
          {globalStats.submissions ? globalStats.submissions : `...`}
         </span>
      </div>
      
      </div>
    </div>

      <div className='mb-4 flex flex-col gap-6'>
        <span>
          <h1 className='text-4xl font-semibold'>Manage Classroom</h1>
          <h2 className='text-xl font-light text-gray-600'>Click on each student from the classroom to manage and analyse their data</h2>
        </span>
          <span className='flex flex-col'>

            <span className='flex justify-between'>
            <h1 className='text-3xl' >{tableClassroom}</h1>
            <h1 className='text-3xl' >{tableAssignment}</h1>
            </span>

            <span className='flex justify-end gap-2 mt-4'>
               <UploadTest onFileSelected={file => {setFile(file), setMessageState("Run Test to see data")}} />
               
                <button className='text-md text-gray-100 hover:bg-[#f1760d] bg-black p-2 rounded-md' onClick={() =>downloadRepo()}>Run Test</button>
            </span>
          </span>
      
      </div>
     
      
        <div className="flex space-x-4 mb-4 text-white">
          <button
            className={`px-4 py-2 rounded-t-lg ${filter === 'all' ? 'bg-[#f1760d] border-t border-l border-r' : 'bg-[#f1760d]'}`}
            onClick={() => setFilter('all')}
          >
            Patricipants ({totalCount})
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg ${filter === 'passing' ? 'bg-[#f1760d] border-t border-l border-r' : 'bg-[#f1760d]'}`}
            onClick={() => setFilter('passing')}
          >
            Passing ({passingCount})
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg ${filter === 'failing' ? 'bg-[#f1760d] border-t border-l border-r' : 'bg-[#f1760d]'}`}
            onClick={() => setFilter('failing')}
          >
            Failing ({failingCount})
          </button>
        </div>

      {/* participants table */}
      {tableLoading ? (
        <div className="text-center text-xl font-semibold">Loading…</div>
      ) : (
       
        <div className="overflow-auto">
         <button onClick={sortAgainstForked} className="cursor-pointer">
          Date Created {forkSortAsc === null ? '⇅' : forkSortAsc ? '↑' : '↓'}
        </button>
          <table className="min-w-full border  ">
            <thead className="bg-[#f1760d]">
              <tr  >
                <th className="p-2 border border-black text-white">Github Username 
                   <button onClick={sortAgainstName} className="cursor-pointer ml-2">
                    {nameSortAsc 
                        ? '↑'
                        : '↓'}
                  </button>
                </th>
                <th className="p-2 border border-black text-white">Submission Repository</th>
                <th className="p-2 border border-black text-white">Public Test  Grade
                  <button onClick={sortAgainstGrade} className="cursor-pointer ml-2">
                    {gradeSortAsc 
                        ? '↑'
                        : '↓'}
                  </button>
                </th>
                <th className="p-2 border border-black text-white">Private Test Grade
                </th>
           
              </tr>
            </thead>
        <tbody ref={section1Ref}>
              {filtered.map(p => {
              // grab the result object for this repo, if present
              const result = results.find(r => r.repo === p.repository.name);
                return (
                  <tr key={p.id} className="hover:bg-gray-50" >
                    <td className="p-2 border">
                      <Link
                        to="/Student"
                        state={{ participantName: p.students[0].login , result: results.filter(r => r.repo === p.repository.name) , participantAvatar: p.students[0].avatar_url , participantLink: p.students[0].html_url }}
                        className="hover:text-[#f1760d]"
                      >
                        {p.students[0].login}
                      </Link>
                    </td>
                    
                    <td className="p-2 border text-left">
                      <a
                        href={p.repository.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#f1760d]"
                      >
                        {formatGithubLink(p.repository.html_url)}
                      </a>
                    </td>
                    <td className="p-2 border text-center">{p.grade}</td>
            
                  <td className="p-2 border text-center">
                    {p.grade !== "100/100" ? (
                      "NA"
                    ) : result ? (
                      result.error ? (
                        result.error
                      ) : (
                        <div className="flex justify-center">
                          {`${result.passed * 100}/${result.total * 100}`}
                          <div className="ml-12 flex gap-2">
                            <a
                              href={`http://localhost:3000${result.url}`}
                              download
                              aria-label="Download private-test log"
                              className="hover:opacity-70"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24">
                                <g transform="scale(.4) translate(12 12)">
                                  <path
                                    d="M 20 8 C 13.54 8 8.37 13.11 8.09 19.5
                                      C 3.42 20.78 0 25 0 30
                                      C 0 36.05 4.95 41 11 41 H 41
                                      C 45.95 41 50 36.95 50 32
                                      C 50 28.10 47.40 24.79 43.91 23.62
                                      C 43.70 17.76 38.91 13 33 13
                                      c -1.04 0 -2.01.26 -2.97.53
                                      C 27.88 10.26 24.22 8 20 8 Z
                                      M 24 20 V 31.56 L 19.72 27.28
                                      l -1.44 1.44 6 6 .72 .69 .72 -.69
                                      l 6 -6 -1.44 -1.44 L 26 31.56 V 20 Z"
                                    fill="currentColor"
                                  />
                                </g>
                              </svg>
                            </a>
                            <a
                              href={`http://localhost:3000/outputs/${result.url.replace('/download/', '/')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="View private-test log"
                              className="hover:opacity-70"
                            >

                              <svg width="24" height="24" viewBox="0 0 24 24">
                                <path
                                  d="M12 4c-5 0-9.27 3.11-11 8
                                    1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
                                  fill="currentColor"
                                />
                              </svg>
                            </a>
                          </div>
                        </div>
                      )
                    ) : (
                      messageState
                    )}
                  </td>

                  </tr>
                )
              })}
            </tbody>
          </table>

        </div>
      )}

    </div>

  )
}

export default Admin
