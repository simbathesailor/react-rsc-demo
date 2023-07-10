# Example

To run this example:

- `npm install` or `yarn`
- `npm run dev` or `yarn dev`

# Based on Dan's writeup on RSC

https://github.com/reactwg/server-components/discussions/5

# Covered some additional challenges mentioned in writeup.

- [x] Add a random background color to the <body> of the page, and add a transition on the background color. When you navigate between the pages, you should see the background color animating.
- [x] Implement support for fragments (<>) in the RSC renderer. This should only take a couple of lines of code, but you need to figure out where to place them and what they should do.
      Once you do that, change the blog to format the blog posts as Markdown using the <Markdown> component from react-markdown. Yes, our existing code should be able to handle that!
      The react-markdown component supports specifying custom implementations for different tags. For example, you can make your own Image component and pass it as <Markdown components={{ img: Image }}>. Write an Image component that measures the image dimensions (you can use some npm package for that) and automatically emits width and height.

- [x] Add a comment section to each blog post. Keep comments stored in a JSON file on the disk. You will need to use `<form>` to submit the comments. As an extra challenge, extend the logic in client.js to intercept form submissions and prevent reloading the page. Instead, after the form submits, refetch the page JSX so that the comment list updates in-place.
