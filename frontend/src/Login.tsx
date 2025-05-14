
import CryptoJS from 'crypto-js';
import { useState } from 'react';
import { useNavigate } from 'react-router';


function Login() {
    const secret =   import.meta.env.VITE_SECRET_KEY
    
    const [token, setToken] = useState('');
    const navigate = useNavigate();
    const handleTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setToken(event.target.value);
        
    };
    const handleSubmit = () => {
        const encryptedToken = encryptData(token);
        localStorage.setItem('encryptedToken', encryptedToken);
        navigate('/admin');

    }    
    const encryptData = (data) => {
        if (!secret) {
            throw new Error('Secret key is not defined');
        }
        return CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
    };
return (
  <>
   <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0c0def] text-white">
         
         <div className="bg-[#9797b94e] p-6 rounded-xl shadow-md w-96">
        <h2 className="text-[22px] font-bold mb-4 text-center">Login with your Github Token</h2>

        <form >
                <div className="mb-4">
                    <input
                    type="text"
                    id="token"
                    className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"       
                        placeholder="Enter your Token"
                        onChange={handleTokenChange}
                        value={token}
                        />
                </div>

                 <button className="w-84 mx-auto mb-4 justify-center items-center flex bg-[#FF9977] hover:bg-[#ffc073] text-white font-bold py-2 px-4 rounded cursor-pointer" onClick={handleSubmit} type="submit">Proceed</button>

            </form>
            <p className="text-center text-blue-300 underline ">
                Instructions
            </p>
         </div>
   </div>
   
  </>
)
}

export default Login;