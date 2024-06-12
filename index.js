const express = require('express');
const app=express()
require('dotenv').config()
const jwt= require ('jsonwebtoken')
const cookieParser = require('cookie-parser')
const cors = require('cors');
const port= process.env.PORT||6003

// middleware

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uoysey8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// const cookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
// };
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const classCollection= client.db('skillTrackDb').collection('classes')
    const userCollection= client.db('skillTrackDb').collection('users')
    const teacherCollection= client.db('skillTrackDb').collection('teachers')


    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      console.log('hit for the admin ')
      const user = req.user
      const query = { email: user?.email }
      const result = await userCollection.findOne(query)
      console.log('user role' ,result?.role)
      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

      next()
    } 

    // verify teacher middleware
    const verifyTeacher = async (req, res, next) => {
      console.log('hit for the admin ')
      const user = req.user
      const query = { email: user?.email }
      const result = await userCollection.findOne(query)
      console.log('user role' ,result?.role)
      if (!result || result?.role !== 'teacher'){
        return res.status(401).send({ message: 'unauthorized access!!' })
      }

      next()
    }

    // auth related api OR creating Token
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    //clearing Token OR Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })
    // save classes in the mongoDb 
    app.post('/class', verifyToken,verifyTeacher,async(req,res)=>{
      const classData=req.body
      const result= await classCollection.insertOne(classData)
      res.send(result)
    })

    //  get all classes
    app.get('/allClass',async(req,res)=>{
      const result = await classCollection.find().toArray()
      res.send(result)
    })
    //  get a class by id
    app.get('/allClass/:id',async(req,res)=>{
      const id= req.params.id
      const query= {_id:new ObjectId(id)}
      const result = await classCollection.findOne(query)
      res.send(result)
    })

     // update teacher class

     app.patch('/class/update/:id', async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      try {
        const result = await classCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.send(result);
      } catch (error) {
        console.error('Error updating class', error);
        res.status(500).send('Internal Server Error');
      }
    });
    
    // get all classes for teacher
    app.get('/my-classes/:email',verifyToken,verifyTeacher,async(req,res)=>{
      const email= req.params.email
      const query= {'teacher.email':email}
      // console.log(query)
      const result= await classCollection.find(query).toArray()
      res.send(result)
    })

    // delete room from db with _id
    app.delete('/my-classes/:id',verifyToken,verifyTeacher,async(req,res)=>{
      const id = req.params.id
      const query ={_id:new ObjectId(id)}
      const result = await classCollection.deleteOne(query)
      res.send(result)
    })

    // save one user information in mongoDb

    app.put('/user', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      // check if user already exists in db
      const isExist = await userCollection.findOne(query)
      if (isExist) {
        if (user.status === 'Requested') {
          // if existing user try to change his role
          const result = await userCollection.updateOne(query, {
            $set: { 
              status:user?.status,
               experience: user?.experience,
            title: user?.title,
            category: user?.category,
            image: user?.image,
          name: user?.name,
             },
          })
          return res.send(result)
        } else {
          // if existing user login again
          return res.send(isExist)
        }
      }
      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await userCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    // get a user by email from mongoDb
    app.get('/user/:email',async(req,res)=>{
      const email=req.params.email
      const result =await userCollection.findOne({email})
      res.send(result)
    })


    // get all users from mongoDb
    app.get('/users',verifyToken,verifyAdmin, async(req,res)=>{
      const result= await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/user', verifyToken,verifyAdmin, async (req, res) => {
      try {
        // const users = await userCollection.find({ status: 'Requested' }).toArray();
        const users = await userCollection.find({
          status: { $in: ['requested', 'accepted', 'rejected'] }
        }).toArray();
        res.send(users);
      } catch (err) {
        console.error('Error fetching users', err);
        res.status(500).send('Internal Server Error');
      }
    });
    // update user role
    app.patch('/user/update/:email',async(req,res)=>{
      const email = req.params.email
      const user= req.body
      const query= {email}
      const updateDoc={
        $set:{...user,createTime:Date.now()}
      }
      const result =await userCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    // save user as teacher in db
    // app.post('/teachers',async(req,res)=>{
    //   const teacherData= req.body
    //   const result =await teacherCollection.insertOne(teacherData)
    //   res.send(result)
    // })

    
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('SkillTrack is running')
  })
  
  app.listen(port, () => {
    console.log(`SkillTrack is running on port ${port}`)
  })