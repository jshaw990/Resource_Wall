<!DOCTYPE html>
<html lang="en">
        <head>
                <link href="https://fonts.googleapis.com/css?family=Raleway" rel="stylesheet">
        </head>
                <p style= "font-family:'Raleway', sans-serif;font-size:25px"><% user_id %> Page
        <body style="font-size:20px; padding:50px;">
                <% include partials/_header %>
                <form action="/resources" method="POST" style="font-family:'Raleway', sans-serif; width: 300px">
                        <label for="newResource" style="font-family:'Raleway', sans-serif">Add a new resource:</label>
                        <input id="newResource" type="text" name="newResource" placeholder="http://">
                        <input id="category" type="text" name="category" placeholder="TBR with a dropdown">
                        <input id="type" type="test" name="type" placeholder="TBR with a dropdown">
                        <input id="description" type="text" name="description" placeholder="Say a few words about the resource">
                        <input type="submit" style="font-family:'Raleway', sans-serif" value="Submit">
                </form>

                <p style= "font-family:'Raleway', sans-serif;font-size:20px">
                    Here we will list all of the user's resources</p>
        </body>
</html>