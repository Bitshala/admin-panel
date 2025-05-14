import React, { useEffect, useState } from 'react'
import CryptoJS from 'crypto-js'
import { Octokit } from 'octokit'
import { Link } from 'react-router'

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
  const [results, setResults] = useState<
    { url:any;  repo: string; passed: number; total: number; error?: string;}[]
  >([]);

  // decrypt token & instantiate Octokit once
  let token = ""
  useEffect(() => {
    if (!encryptedToken || !secret) return
    const bytes = CryptoJS.AES.decrypt(encryptedToken, secret)
    token = bytes.toString(CryptoJS.enc.Utf8)
    if (token) setOctokit(new Octokit({ auth: JSON.parse(token) }))
  }, [encryptedToken, secret])

  // fetch user & classrooms once octokit is ready
  useEffect(() => {
    setLoading(true)
    if (!octokit) return

    const fetchUser = async () => {
      const { data } = await octokit.request('GET /user')
      setUser(data)
    }

    const fetchClassrooms = async () => {
      const { data: cls } = await octokit.request('GET /classrooms')
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

  // fetch participants for an assignment
  const fetchParticipants = async (assignment_id: number) => {
    if (!octokit) return
    setTableLoading(true)
    const { data } = await octokit.request(
      'GET /assignments/{assignment_id}/accepted_assignments',
      { assignment_id, per_page: 100 }
    )
    const sorted = data.sort((a: any, b: any) =>
      a.grade === '100/100' ? -1 :
      b.grade === '100/100' ? 1 :
      a.grade === '0/100'   ? -1 :
      b.grade === '0/100'   ? 1 : 0
    )

    setParticipants(sorted)
    setTableClassroom(sorted[0].assignment.classroom.name)
    setTableAssignment(sorted[0].assignment.title)
    setTableLoading(false)
    setFilter('all')
  }

  useEffect(() => {
    if (!octokit) return
    fetchParticipants(601173)
  }, [octokit])

async function downloadRepo(file: File) {
  if (!file) {
    return alert("Please select a file first!");
  }

  const winners = participants.filter(p => p.grade === "100/100");
  if (winners.length === 0) {
    return alert("No participants with 100/100 found.");
  }

  setResults([]);  // clear previous results

  for (const p of winners) {
    const form = new FormData();
    form.append("token", token);
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
      console.log("downloadUrl", downloadUrl)
      console.log("json", json)
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

console.log("results", results)

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
  return (
    
    <div className="p-12 font-mono">
     
      {/* user info */} 
      {user && (
        <a className='cursor-pointer' href={user.html_url} target="_blank" rel="noopener noreferrer">
        <div className="flex items-center space-x-4 mb-6">
          <img src={user.avatar_url} className="w-16 h-16 rounded-full" />
          <h2 className="text-xl font-semibold">{user.name}</h2>
        </div>
        </a>  
      )}
 
      {/* classrooms + assignments */}
      <div className="grid grid-cols-2 gap-4 mb-12">
        {classrooms.map(c => (
          <div key={c.id} className="bg-gray-200 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold">
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {c.name}
              </a>
            </h2>
            {c.assignments.map((a: any) => (
            <div className='flex justify-between items-center' key={a.id}>
              <button
                key={a.id}
                className="mt-2 underline text-blue-600 cursor-pointer truncate "
                onClick={() => fetchParticipants(a.id)}
              >
                {a.title}
              </button>
              {/* <button>
                Upload Test
              </button> */}
              <input
                type="file"
                className="text-sm text-stone-500
                          file:mr-5 file:py-1 file:px-3 file:border-[1px]
                          file:text-xs file:font-medium
                          file:bg-stone-50 file:text-stone-700
                          hover:file:cursor-pointer hover:file:bg-blue-50
                          hover:file:text-blue-700"
                onChange={e => downloadRepo(e.target.files[0])}
              />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* stats tabs */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded-t-lg ${filter === 'all' ? 'bg-white border-t border-l border-r' : 'bg-gray-200'}`}
          onClick={() => setFilter('all')}
        >
          All ({totalCount})
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${filter === 'passing' ? 'bg-white border-t border-l border-r' : 'bg-gray-200'}`}
          onClick={() => setFilter('passing')}
        >
          Passing ({passingCount})
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg ${filter === 'failing' ? 'bg-white border-t border-l border-r' : 'bg-gray-200'}`}
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

          <table className="min-w-full border">
            <caption className="text-lg font-semibold mb-4">
              {tableClassroom} - {tableAssignment}
            </caption>
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Login</th>
                <th className="p-2 border">Submission Repository</th>
                <th className="p-2 border">Public Test  Grade</th>
                <th className="p-2 border">Private Test Grade</th>
           
              </tr>
            </thead>
        <tbody>
              {filtered.map(p => {
              // grab the result object for this repo, if present
              const result = results.find(r => r.repo === p.repository.name);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-2 border">
                      <Link
                        to="/Student"
                        state={{ participantName: p.students[0].login , result: results.filter(r => r.repo === p.repository.name) }}
                        className="text-blue-600 underline"
                      >
                        {p.students[0].login}
                      </Link>
                    </td>
                    <td className="p-2 border text-left">
                      <a
                        href={p.repository.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600"
                      >
                        {formatGithubLink(p.repository.html_url)}
                      </a>
                    </td>
                    <td className="p-2 border text-center">{p.grade}</td>
                  {/* NEW: Private Test Grade cell */}
            
              <td className="p-2 border text-center">
                      {p.grade !== "100/100" ? (
                        "NA"
                      ) : result ? (
                        result.error ? (
                          result.error
                        ) : (
                          <a
                            href={`http://localhost:3000${result.url}`}   // same value you got back
                            download                                      // keep download attr
                          >
                            {`${result.passed * 100}/${result.total * 100}`}
                          </a>
                        )
                      ) : (
                        "Pending"
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
