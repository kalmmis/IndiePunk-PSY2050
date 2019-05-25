﻿using System.Collections; using System.Collections.Generic; using UnityEngine; using System; [CreateAssetMenu(fileName ="Pattern", menuName ="Pattern/Pattern")] public class Pattern : ScriptableObject {     public Projectile p;     public string movingType;     public string attackType;     public float duration;     public float shotTime;     delegate void moving();      public Pattern() { }     //public Pattern(Projectile _p, string _movingType, string _attackType, float _duration, float _shotTime)     //{     //    Projectile p = _p;     //    string movingType = _movingType;     //    string attackType = _attackType;     //    float duration = _duration;     //    float shotTime = _shotTime;     //}      public void Moving(Enemy parent, float speed) {         switch(movingType)         {             case "A" :                 parent.transform.Translate(Vector3.down * speed * Time.deltaTime);                 break;             case "B":                 parent.transform.Translate(Vector3.down * speed * Time.deltaTime);                 break;         }     }     public void Attack(GameObject go)     {         Projectile newP;         switch (attackType)         {             case "A":                 newP = Instantiate(p, go.transform.position, Quaternion.identity);                 Vector3 v = new Vector3(0,0,0);                 GameObject target = GameObject.Find("Player");                 newP.GetComponent<DirectMoving>().moveFunc = (Transform t) =>                 {                     if (target != null && v.Equals(new Vector3(0, 0, 0)))                     {                         Transform targetTransform = target.GetComponent<Transform>();                         float x = targetTransform.position.x - t.position.x ;                         float y = targetTransform.position.y - t.position.y ;                         v = new Vector3(x/3, y/3);                     }                     t.Translate(v * 1f * Time.deltaTime);                 };                 break;             case "B":                 float d = (float) Math.Sqrt(0.5d);                 Vector3[] v3 = { Vector3.left, Vector3.right, new Vector3(d,d,0), new Vector3(-d, d, 0) , new Vector3(d, -d, 0), new Vector3(-d, -d, 0) };                 foreach (Vector3 vector in v3)                 {                     newP = Instantiate(p, go.transform.position, Quaternion.identity);                     newP.GetComponent<DirectMoving>().moveFunc = (Transform t) =>                     {                         t.Translate(vector * 5f * Time.deltaTime);                     };                 }                 break;             case "X":                 break;         }     } }