import pathlib, json

quiz_path = pathlib.Path(r"C:\Users\alabu\Documents\phishwise-wise-detection-improved\phishwise\src\data\quizzes.js")
new_path = pathlib.Path(r"C:\Users\alabu\Documents\phishwise-wise-detection-improved\new_quizzes.json")

text = quiz_path.read_text(encoding='utf-8')
new_quizzes = json.loads(new_path.read_text(encoding='utf-8'))

new_js = ""
for q in new_quizzes:
    new_js += "  {\n"
    new_js += f'    id: {json.dumps(q["id"])},\n'
    new_js += f'    title: {json.dumps(q["title"])},\n'
    new_js += f'    category: {json.dumps(q["category"])},\n'
    new_js += f'    difficulty: {json.dumps(q["difficulty"])},\n'
    new_js += f'    minutes: {q["minutes"]},\n'
    new_js += f'    timed: {str(q["timed"]).lower()},\n'
    if "timeLimit" in q:
        new_js += f'    timeLimit: {q["timeLimit"]},\n'
    new_js += f'    description: {json.dumps(q["description"])},\n'
    new_js += "    questions: [\n"
    for qu in q["questions"]:
        new_js += "      {\n"
        new_js += f'        type: {json.dumps(qu["type"])},\n'
        new_js += f'        q: {json.dumps(qu["q"])},\n'
        new_js += f'        options: {json.dumps(qu["options"])},\n'
        new_js += f'        answer: {qu["answer"]},\n'
        new_js += f'        explanation: {json.dumps(qu["explanation"])},\n'
        new_js += "      },\n"
    new_js += "    ],\n"
    new_js += "  },\n"

idx = text.rfind("];")
if idx != -1:
    new_text = text[:idx] + ",\n" + new_js + text[idx:]
    quiz_path.write_text(new_text, encoding='utf-8')
    print(f"Added {len(new_quizzes)} quizzes")
    print("total", new_text.count('id: "'))
else:
    print("not found")
