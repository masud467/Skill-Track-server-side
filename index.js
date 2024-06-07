const express = require('express');
const app=express()
require('dotenv').config()
const cors = require('cors');
const port= process.env.PORT||6003

// middleware
app.use(cors())
app.use(express.json())




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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const classCollection= client.db('skillTrackDb').collection('classes')
    const userCollection= client.db('skillTrackDb').collection('users')
    // save classes in the mongoDb 
    app.post('/class',async(req,res)=>{
      const classData=req.body
      const result= await classCollection.insertOne(classData)
      res.send(result)
    })
    // get all classes for teacher
    app.get('/my-classes/:email',async(req,res)=>{
      const email= req.params.email
      const query= {'teacher.email':email}
      // console.log(query)
      const result= await classCollection.find(query).toArray()
      res.send(result)
    })

    // delete room from db with _id
    app.delete('/my-classes/:id',async(req,res)=>{
      const id = req.params.id
      const query ={_id:new ObjectId(id)}
      const result = await classCollection.deleteOne(query)
      res.send(result)
    })

    // save one user information in mongoDb
    app.put('/user',async(req,res)=>{
      const user = req.body 
      const query ={email:user?.email}
      // if user already exist in mongoDb
      const isUserExist= await userCollection.findOne(query)
      if(isUserExist) return res.send(isUserExist)
      // save new user
      const options = {upsert:true}
      const updateDoc={
        $set:{
          ...user,
          createTime:Date.now()
        }
      }
      const result = await userCollection.updateOne(query,updateDoc,options)
      res.send(result)
    })

    // get all users from mongoDb
    app.get('/users',async(req,res)=>{
      const result= await userCollection.find().toArray()
      res.send(result)
    })
    
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