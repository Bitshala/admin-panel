import React, { useEffect, useState } from 'react'
import CryptoJS from 'crypto-js'
import { Octokit } from 'octokit'
import { useLocation } from 'react-router'

const Student: React.FC = () => {
  const secret = import.meta.env.VITE_SECRET_KEY
  const encryptedToken = localStorage.getItem('encryptedToken')
  const [rowID,setRowID] = useState(0)
  // state
  const [octokit, setOctokit] = useState<Octokit | null>(null)
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState(null);
  const [total,setTotal] = useState("");
  const [passed,setPassed] = useState("");
  const [ downloadLink, setDownloadLink] = useState("");


  // read username filter from link state
  const { state } = useLocation()
  const filterName: string | undefined = state?.participantName
  const result = state?.result
  console.log(result ,"result")


  // decrypt token & instantiate Octokit once
  useEffect(() => {
    if (!encryptedToken || !secret) return
    const bytes = CryptoJS.AES.decrypt(encryptedToken, secret)
    const token = bytes.toString(CryptoJS.enc.Utf8)
    if (token) setOctokit(new Octokit({ auth: JSON.parse(token) }))
  }, [encryptedToken, secret])

  // function: fetch all classrooms, assignments, and filtered participants
  const fetchAllData = async (username?: string) => {
  setLoading(true);  
  if (!octokit) return []

  // helper to fetch–and–filter participants
  const getParts = async (assignmentId: number) => {
    const { data } = await octokit.request(
      'GET /assignments/{assignment_id}/accepted_assignments',
      { assignment_id: assignmentId, per_page: 100 }
    )
    return username
      ? data.filter(p => p.students?.[0]?.login === username)
      : data
  }

  const { data: classrooms } = await octokit.request('GET /classrooms')
  const nested = await Promise.all(
    classrooms.map(async (c: any) => {
      const { data: assignments } = await octokit.request(
        'GET /classrooms/{classroom_id}/assignments',
        { classroom_id: c.id }
      )
      const assignmentsWithParts = await Promise.all(
        assignments.map(async (a: any) => ({
          ...a,
          participants: await getParts(a.id)
        }))
      )
      return { ...c, assignments: assignmentsWithParts }
    })
  )

  // flat list of matched participants (empty if no username)
  const flat = username
    ? nested.flatMap(c => c.assignments).flatMap(a => a.participants)
    : []

  setParticipants(flat)
  setLoading(false);
  return nested
}


  // trigger fetch on mount
  useEffect(() => {
    if (!octokit) return
    fetchAllData(filterName).then(setClassrooms)
  }, [octokit, filterName])

 

  return (

  <div className="overflow-auto p-12 font-mono font-light ">
    <h1 className="text-3xl font-bold mb-4">Student View</h1>

{!loading ? 
  <table className="min-w-full border">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-2 border">Student</th>
        <th className="p-2 border">Assignment</th>
        <th className="p-2 border">Classroom</th>
        <th className="p-2 border">Commit Count</th>
        <th className="p-2 border">Grade</th>
        <th className="p-2 border">Private Test Grade</th>
      </tr>
    </thead>

    <tbody>
      {participants.map((p) => {
        // every `p` is one of your objects
        const student = p.students[0]  // you only have one student per entry
        const { assignment, commit_count, grade, repository } = p
        return (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="p-2 border">{student.login}</td>
            <td className="p-2 border">
                <a
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600"
              >
                 {assignment.title}
              </a>
            </td>
            <td className="p-2 border">{assignment.classroom.name}</td>
            <td className="p-2 border text-center">{commit_count}</td>
            <td className="p-2 border text-center">{grade ? grade : "FAIL"}</td>
   
            <td className="p-2 border text-center">
               {result.length>0 && result[0].repo == repository.name ?
               <>
               {result[0].passed*100}/{result[0].total*100}
               </>
                :"NA"}
            </td>
          
              
          </tr>
        )
      })}
    </tbody>
      <tbody>
        <tr>
          <td colSpan={6} className="p-2 border text-center">
            Loading...
          </td>
        </tr>
      </tbody>
  </table>
  :"Please wait while the app fetches your data..."}
  </div>

  )
}

export default Student
