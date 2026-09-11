import axios from 'axios';

async function test() {
  try {
    // 1. Register or login as Job Seeker
    const loginRes = await axios.post('http://localhost:4000/api/v1/user/login', {
      email: 'seeker@test.com',
      password: 'password123',
      role: 'Job Seeker'
    });
    
    const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
    console.log("Logged in:", loginRes.data.success);
    
    // 2. Get a job
    const jobsRes = await axios.get('http://localhost:4000/api/v1/job/getall');
    if(jobsRes.data.jobs.length === 0) {
       console.log("No jobs found");
       return;
    }
    const jobId = jobsRes.data.jobs[0]._id;
    console.log("Job ID:", jobId);
    
    // 3. Apply to the job
    // create form data
    const FormData = require('form-data');
    const form = new FormData();
    form.append('name', 'Test');
    form.append('email', 'seeker@test.com');
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
