/*
  Assessment question bank (front-end only)
  - Mirrors the lightweight, instant-feedback style of W3Schools quizzes
  - Extend `courseAssessmentBank` to provide course-specific sets
*/

export const defaultAssessmentSets = [
  {
    id: "js-essentials",
    title: "JavaScript Essentials",
    level: "Beginner",
    summary: "Quick check on syntax, array helpers, and safe defaults.",
    tags: ["Auto-graded", "Instant feedback"],
    questions: [
      {
        id: "js-compare",
        prompt: "What does the strict equality operator (===) compare?",
        options: [
          { id: "a", label: "Only value, after coercing types" },
          { id: "b", label: "Both value and type, without coercion" },
          { id: "c", label: "Object references only" },
          { id: "d", label: "Whether two variables point to the same DOM node" },
        ],
        correctOptionId: "b",
        explanation: "=== compares both value and type; == allows type coercion first.",
      },
      {
        id: "js-filter",
        prompt: "Which array method returns a new array containing items that match a condition?",
        options: [
          { id: "a", label: "forEach()" },
          { id: "b", label: "filter()" },
          { id: "c", label: "push()" },
          { id: "d", label: "map() changes the array in place" },
        ],
        correctOptionId: "b",
        explanation: "filter() returns a brand new array with only the items that pass the callback check.",
      },
      {
        id: "js-const",
        prompt: "What does declaring a variable with const guarantee?",
        options: [
          { id: "a", label: "The value inside can never change" },
          { id: "b", label: "The binding cannot be reassigned and is block-scoped" },
          { id: "c", label: "It has function scope like var" },
          { id: "d", label: "It is hoisted and initialized to null" },
        ],
        correctOptionId: "b",
        explanation:
          "const creates a block-scoped binding that cannot be reassigned, but referenced objects can still mutate.",
      },
      {
        id: "js-fetch",
        prompt: "What HTTP method does fetch(\"/api/resource\") use when no options are passed?",
        options: [
          { id: "a", label: "POST" },
          { id: "b", label: "PUT" },
          { id: "c", label: "GET" },
          { id: "d", label: "It depends on the browser" },
        ],
        correctOptionId: "c",
        explanation: "By default fetch() performs a GET request unless a different method is provided.",
      },
      {
        id: "js-prevent-default",
        prompt: "What does event.preventDefault() do inside an event handler?",
        options: [
          { id: "a", label: "Stops the event from bubbling up the DOM" },
          { id: "b", label: "Cancels the browser's default action for that event" },
          { id: "c", label: "Removes all other listeners on the target element" },
          { id: "d", label: "Restarts the event loop tick" },
        ],
        correctOptionId: "b",
        explanation: "preventDefault() blocks the built-in browser behavior (like submitting a form or following a link).",
      },
      {
        id: "js-await-error",
        prompt: "How do you safely handle errors when using await inside an async function?",
        options: [
          { id: "a", label: "Wrap the await call in try/catch" },
          { id: "b", label: "Use await only inside setTimeout" },
          { id: "c", label: "Prefix the promise with void" },
          { id: "d", label: "await automatically retries three times" },
        ],
        correctOptionId: "a",
        explanation: "Use try/catch around await calls or chain .catch() on the promise to handle errors.",
      },
    ],
  },
  {
    id: "web-foundations",
    title: "HTML & CSS Foundations",
    level: "Starter",
    summary: "Semantics, selectors, and layout primitives for the web.",
    tags: ["Hands-on", "W3Schools style"],
    questions: [
      {
        id: "markup-root",
        prompt: "Which element should wrap the rest of the content in a valid HTML document?",
        options: [
          { id: "a", label: "<body>" },
          { id: "b", label: "<html>" },
          { id: "c", label: "<head>" },
          { id: "d", label: "<main>" },
        ],
        correctOptionId: "b",
        explanation: "<html> is the root element; <head> and <body> live inside it.",
      },
      {
        id: "image-alt",
        prompt: "Which attribute provides accessible fallback text for an <img> tag?",
        options: [
          { id: "a", label: "title" },
          { id: "b", label: "srcset" },
          { id: "c", label: "alt" },
          { id: "d", label: "aria-label only" },
        ],
        correctOptionId: "c",
        explanation: "Use the alt attribute to describe the image for screen readers and slow connections.",
      },
      {
        id: "semantic-button",
        prompt: "Which element is most appropriate for actions that are not navigation?",
        options: [
          { id: "a", label: "<a>" },
          { id: "b", label: "<div role=\"button\">" },
          { id: "c", label: "<button>" },
          { id: "d", label: "<span onclick>" },
        ],
        correctOptionId: "c",
        explanation: "Use the native <button> element for actions; <a> is for navigation.",
      },
      {
        id: "css-id-selector",
        prompt: "Which CSS selector targets an element with id=\"header\"?",
        options: [
          { id: "a", label: ".header" },
          { id: "b", label: "#header" },
          { id: "c", label: "header" },
          { id: "d", label: "*header" },
        ],
        correctOptionId: "b",
        explanation: "Prefix an id with #; prefix a class with .",
      },
      {
        id: "flex-center",
        prompt: "How do you center items horizontally in a flex container row?",
        options: [
          { id: "a", label: "align-items: center;" },
          { id: "b", label: "justify-content: center;" },
          { id: "c", label: "text-align: center;" },
          { id: "d", label: "margin: auto 0;" },
        ],
        correctOptionId: "b",
        explanation: "justify-content controls distribution along the main axis; align-items is for the cross axis.",
      },
      {
        id: "responsive-units",
        prompt: "Which CSS unit scales with the root font size to keep layouts responsive?",
        options: [
          { id: "a", label: "px" },
          { id: "b", label: "%" },
          { id: "c", label: "vh" },
          { id: "d", label: "rem" },
        ],
        correctOptionId: "d",
        explanation: "rem units are relative to the root font size, making them predictable for responsive text sizing.",
      },
    ],
  },
];

const courseAssessmentBank = {
  // Example for a course slug override:
  // "gradus-x/javascript-mastery": [custom questions...]
};

const normalizeSlug = (value = "") => value.toString().trim().toLowerCase();

export const getAssessmentsForCourse = ({ courseSlug = "", programmeSlug = "" } = {}) => {
  const courseKey = normalizeSlug(courseSlug);
  const programmeKey = normalizeSlug(programmeSlug);
  const combinedKey = courseKey && programmeKey ? `${programmeKey}/${courseKey}` : courseKey;

  if (combinedKey && courseAssessmentBank[combinedKey]) {
    return courseAssessmentBank[combinedKey];
  }
  if (courseKey && courseAssessmentBank[courseKey]) {
    return courseAssessmentBank[courseKey];
  }
  return defaultAssessmentSets;
};

export default getAssessmentsForCourse;
