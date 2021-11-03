const jwt = require('jsonwebtoken');
const redis = require("redis");
const redisClient = redis.createClient(process.env.REDIS_URI);

const handleSignin = (req, res,db, bcrypt) => {
  const { email, password } = req.body;
  if (!email || !password) {
    // return res.status(400).json('incorrect form submission');
    return Promise.reject("Incorrect form Submission")
  }
  return db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => user[0])
          .catch(err => Promise.reject(`unable to get user: ${err}`))
      } else {
        Promise.reject('email or password does not exist')
      }
    })
    .catch(err => Promise.reject('wrong credentials'))
}


const getAuthToken = (req, res) =>{
  const {authorization} = req.headers;
  return redisClient.get(authorization, (err, reply)=>{
    if (err || !reply){
      return res.status(400).json('unauthorized!!!')
    }
    return res.json({id: reply})
  })
}


const signToken = (email) => {
  const jwtPayload = {email};
  return jwt.sign(jwtPayload, 'JWT_SECRET', {expiresIn: '2 days'});
}


const setToken = (key, value) =>{
// We are using Promise.resolve bcos redis does not return a promise naturally and we need a promise
  return Promise.resolve(redisClient.set(key, value))
}

const createSession = (user) => {
  //JWT token, return user data. Install JWT package to do this
  const {email, id} = user
  const token = signToken(email);
  return setToken(token, id)
    .then(()=>{
      return { success:'true', userId: id, token }})
    .catch(console.log)
}

const signInAuthentication = (req, res, db, bcrypt)=>{
  const {authorization} = req.headers;
  console.log(authorization)
  return authorization? 
  getAuthToken(req, res) : 
  handleSignin(req, res, db, bcrypt)
    .then(data=>{
      return data.id && data.email? createSession(data):Promise.reject(data)
    })
    .then(session=>res.json(session))
    .catch(err=>res.status(400).json(err))
}

module.exports = {
  signInAuthentication: signInAuthentication,
  redisClient: redisClient
}