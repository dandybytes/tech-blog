import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import {MongoClient} from 'mongodb';

const app = express();

app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const port = process.env.PORT || 8000;

const withDb = async (operations, response) => {
  const mongoUrl = 'mongodb://localhost:27017';
  const mongoOptions = {useNewUrlParser: true, useUnifiedTopology: true};

  try {
    const mongoClient = await MongoClient.connect(mongoUrl, mongoOptions);
    const db = mongoClient.db('my-blog');

    await operations(db);

    mongoClient.close();
  } catch (error) {
    response.status(500).json({message: 'Error connecting to the DB', error});
  }
};

app.get('/api/articles/:name', async (request, response) => {
  withDb(async db => {
    const articleName = request.params.name;

    const articleInfo = await db.collection('articles').findOne({name: articleName});
    response.status(200).json(articleInfo);
  }, response);
});

app.post('/api/articles/:name/upvote', async (request, response) => {
  const articleName = request.params.name;

  withDb(async db => {
    const articleInfo = await db.collection('articles').findOne({name: articleName});
    await db.collection('articles').updateOne({name: articleName}, {$set: {upvotes: articleInfo.upvotes + 1}});
    const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});

    response.status(200).json(updatedArticleInfo);
  }, response);
});

app.post('/api/articles/:name/add-comment', (request, response) => {
  const {username, text} = request.body;
  const articleName = request.params.name;

  withDb(async db => {
    const articleInfo = await db.collection('articles').findOne({name: articleName});
    await db
      .collection('articles')
      .updateOne({name: articleName}, {$set: {comments: articleInfo.comments.concat({username, text})}});
    const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});

    response.status(200).json(updatedArticleInfo);
  }, response);
});

app.get('*', (request, response) => response.sendFile(path.join(__dirname + '/build/index.html')));

app.listen(port, () => console.log(`server listening on port ${port}`));
