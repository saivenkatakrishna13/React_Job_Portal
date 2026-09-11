import axios from 'axios';
const FormData = require('form-data');

async function test() {
  try {
    // 1. Register a new Job Seeker
    const email = 'testuser' + Date.now() + '@test.com';
    const registerRes = await axios.post('http://localhost:4000/api/v1/user/register', {
      name: 'Test User',
      email: email,
      phone: 1234567890,
      password: 'password123',
      role: 'Job Seeker'
    });
    
    const cookie = registerRes.headers['set-cookie'][0].split(';')[0];
    console.log("Registered:", registerRes.data.success);
    
    // 2. Get a job
    const jobsRes = await axios.get('http://localhost:4000/api/v1/job/getall');
    if(jobsRes.data.jobs.length === 0) {
       console.log("No jobs found");
       return;
    }
    const jobId = jobsRes.data.jobs[0]._id;
    console.log("Job ID:", jobId);
    
    // 3. Apply to the job
    const form = new FormData();
    form.append('name', 'Test User');
    form.append('email', email);
    form.append('coverLetter', 'Cover letter here');
    form.append('phone', '1234567890');
    form.append('address', 'Test address');
    form.append('jobId', jobId);
    
    const applyRes = await axios.post('http://localhost:4000/api/v1/application/post', form, {
      headers: {
        ...form.getHeaders(),
        Cookie: cookie
      }
    });
    
    console.log("Apply response:", applyRes.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

test();
