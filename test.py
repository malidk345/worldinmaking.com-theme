import re

text = 'className="text-lg font-apple font-bold rounded-full bg-red-500 rounded-[12px] p-4 font-sans font-semibold rounded"'
text = re.sub(r'\brounded(?:-[a-zA-Z0-9]+|-\[[^\]]+\])?(?=\s|")', '', text)
text = re.sub(r'\bfont-(?:sans|serif|mono|apple|code|os|nav|button|fancy|squeak|comic|fairytale|fairytale-title|awesome)(?=\s|")', '', text)
text = re.sub(r'\s+', ' ', text).replace('className=" ', 'className="').replace(' "', '"').strip()
print(text)
