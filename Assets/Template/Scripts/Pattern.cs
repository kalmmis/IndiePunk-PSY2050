﻿using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
[CreateAssetMenu(fileName ="Pattern", menuName ="Pattern/Pattern")]
public class Pattern : ScriptableObject
{
    public Projectile p;
    public string movingType;
    public string attackType;
    public float duration;
    public float shotTime;
    delegate void moving();

    public Pattern() { }
    public Pattern(string _pName, string _movingType, string _attackType,  string _shotTimeString)
    {
        p = Resources.Load<GameObject>("Projectiles/" + _pName).GetComponent<Projectile>();
        movingType = _movingType;
        attackType = _attackType;
        duration = 1;
        shotTime = float.Parse(_shotTimeString);
    }

    public void Moving(Enemy parent, float speed) {
        switch(movingType)
        {
            case "A" :
                parent.transform.Translate(Vector3.down * speed * Time.deltaTime);
                break;
            case "B":                 GameObject target = GameObject.Find("Player");                 //플레이어가 없으면 쫒아갈 것도 없음                 if (target == null) { Destroy(target); return; };
                Vector3 v = new Vector3(0, 0, 0);
                    if (target != null && v.Equals(new Vector3(0, 0, 0)))
                    {
                        /*                          항상 백터크기를 1로 하는 방법                          기울기a 는 a=(y2-y1)/(x2-x1);                          vector의 크기를 항상 n로 하기 위해서는 위 ax=y에서 x^2+y^2 = n^2이 되어야한다.                          n=1 일때를 기준으로                           Math.Sqrt = 제곱근 구하는 함수.                          x1 = (float) Math.Sqrt(Math.Abs(1/(a*a+1)));                          y1 = (float) Math.Sqrt(Math.Abs(a*a/(a*a+1)));                          이된다.                          한편 x1과 y1은 절대값이므로 초기 x와 y의 양수/음수 구분을 기록해 뒀다가 마지막에 양수음수를 맞춰줘야한다.                          */
                        Transform targetTransform = target.GetComponent<Transform>();
                        Transform parentTransform = parent.GetComponent<Transform>();
                        float x = targetTransform.position.x - parentTransform.position.x;
                        float y = targetTransform.position.y - parentTransform.position.y;
                        bool isXneg = x < 0;
                        bool isYneg = y < 0;
                        float a = y / x;
                        float x1 = (float)Math.Sqrt(Math.Abs(1 / (a * a + 1)));
                        float y1 = (float)Math.Sqrt(Math.Abs(a * a / (a * a + 1)));
                        x1 = isXneg && x1 > 0 ? -x1 : x1;
                        y1 = isYneg && y1 > 0 ? -y1 : y1;
                        v = new Vector3(x1, y1);
                    }
                parent.transform.Translate(v * 5f * Time.deltaTime);
                //parent.transform.Translate(Vector3.down * speed * Time.deltaTime);
                break;             case "C":                 parent.transform.Translate(Vector3.down * speed * Time.deltaTime);                 break;
            default:
                throw new Exception("No Moving Type");
        }
    }
    public void Attack(GameObject go)
    {
        Projectile newP;
        Projectile newP2;
        Projectile newP3;
        Player target;
        switch (attackType)
        {
            case "A":
                target = GameObject.FindObjectOfType<Player>();
                //플레이어가 없으면 쏘지 않음
                if (target == null) {
                    Destroy(target); return;
                };
                newP = Instantiate(p, go.transform.position, Quaternion.identity);
                Vector3 v = new Vector3(0,0,0);
                newP.GetComponent<DirectMoving>().moveFunc = (Transform t) =>
                {
                    if (target != null && v.Equals(new Vector3(0, 0, 0)))
                    {
                        /*
                         항상 백터크기를 1로 하는 방법
                         기울기a 는 a=(y2-y1)/(x2-x1);
                         vector의 크기를 항상 n로 하기 위해서는 위 ax=y에서 x^2+y^2 = n^2이 되어야한다.
                         n=1 일때를 기준으로 
                         Math.Sqrt = 제곱근 구하는 함수.
                         x1 = (float) Math.Sqrt(Math.Abs(1/(a*a+1)));
                         y1 = (float) Math.Sqrt(Math.Abs(a*a/(a*a+1)));
                         이된다.
                         한편 x1과 y1은 절대값이므로 초기 x와 y의 양수/음수 구분을 기록해 뒀다가 마지막에 양수음수를 맞춰줘야한다.
                         */
                        Transform targetTransform = target.GetComponent<Transform>();
                        float x = targetTransform.position.x - t.position.x ;
                        float y = targetTransform.position.y - t.position.y ;
                        bool isXneg = x < 0;
                        bool isYneg = y < 0;
                        float a = y / x;
                        float x1 = (float) Math.Sqrt(Math.Abs(1/(a*a+1)));
                        float y1 = (float) Math.Sqrt(Math.Abs(a*a/(a*a+1)));
                        x1 = isXneg && x1 > 0 ? -x1 : x1;
                        y1 = isYneg && y1 > 0 ? -y1 : y1;
                        v = new Vector3(x1, y1);
                    }
                    t.Translate(v * 5f * Time.deltaTime);
                };
                break;
            case "B":
                float d = (float) Math.Sqrt(0.5d);
                Vector3[] v3 = { Vector3.left, Vector3.right, new Vector3(d,d,0), new Vector3(-d, d, 0) , new Vector3(d, -d, 0), new Vector3(-d, -d, 0) };
                foreach (Vector3 vector in v3)
                {
                    newP = Instantiate(p, go.transform.position, Quaternion.identity);
                    newP.GetComponent<DirectMoving>().moveFunc = (Transform t) =>
                    {
                        t.Translate(vector * 5f * Time.deltaTime);
                    };
                }
                break;
            case "C":
                target = GameObject.FindObjectOfType<Player>();
                if (target == null) { Destroy(target); return; };
                v = new Vector3(0, 0, 0);
               
                newP = Instantiate(p, go.transform.position, Quaternion.identity);
                newP.GetComponent<DirectMoving>().moveFunc = (Transform t) =>                 {
                    if (target != null && v.Equals(new Vector3(0, 0, 0)))
                    {
                        /*                          항상 백터크기를 1로 하는 방법                          기울기a 는 a=(y2-y1)/(x2-x1);                          vector의 크기를 항상 n로 하기 위해서는 위 ax=y에서 x^2+y^2 = n^2이 되어야한다.                          n=1 일때를 기준으로                           Math.Sqrt = 제곱근 구하는 함수.                          x1 = (float) Math.Sqrt(Math.Abs(1/(a*a+1)));                          y1 = (float) Math.Sqrt(Math.Abs(a*a/(a*a+1)));                          이된다.                          한편 x1과 y1은 절대값이므로 초기 x와 y의 양수/음수 구분을 기록해 뒀다가 마지막에 양수음수를 맞춰줘야한다.                          */
                        Transform targetTransform = target.GetComponent<Transform>();
                        float x = targetTransform.position.x - t.position.x;
                        float y = targetTransform.position.y - t.position.y;
                        bool isXneg = x < 0;
                        bool isYneg = y < 0;
                        float a = y / x;
                        float x1 = (float)Math.Sqrt(Math.Abs(1 / (a * a + 1)));
                        float y1 = (float)Math.Sqrt(Math.Abs(a * a / (a * a + 1)));
                        x1 = isXneg && x1 > 0 ? -x1 : x1;
                        y1 = isYneg && y1 > 0 ? -y1 : y1;
                        v = new Vector3(x1, y1);
                    }
                    t.Translate(v * 5f * Time.deltaTime);                 };
               
                Vector3 v2 = new Vector3(0, 0, 0);
                newP2 = Instantiate(p, go.transform.position, Quaternion.identity);
                newP2.GetComponent<DirectMoving>().moveFunc = (Transform t) =>                 {
                    if (target != null && v2.Equals(new Vector3(0, 0, 0)))
                    {
                        Transform targetTransform = target.GetComponent<Transform>();
                        float x = targetTransform.position.x - t.position.x;
                        float y = targetTransform.position.y - t.position.y;
                        bool isXneg = x < 0;
                        bool isYneg = y < 0;
                        float a = y / x;
                        double arcTan = Math.Atan(a);
                        double sumangle;
                        sumangle = arcTan >= 135 ? arcTan + 45 - 180 : arcTan + 45;
                        double back2Tan = Math.Tan(sumangle);

                        float x1 = (float)Math.Sqrt(Math.Abs(1 / (back2Tan * back2Tan + 1)));
                        float y1 = (float)Math.Sqrt(Math.Abs(back2Tan * back2Tan / (back2Tan * back2Tan + 1)));
                        x1 = isXneg && x1 > 0 ? -x1 : x1;
                        y1 = isYneg && y1 > 0 ? -y1 : y1;
                        v2 = new Vector3(x1, y1);
                    }
                    t.Translate(v2 * 5f * Time.deltaTime);
                };

                Vector3 vC3 = new Vector3(0, 0, 0);
                newP3 = Instantiate(p, go.transform.position, Quaternion.identity);
                newP3.GetComponent<DirectMoving>().moveFunc = (Transform t) =>                 {
                    if (target != null && vC3.Equals(new Vector3(0, 0, 0)))
                    {
                        Transform targetTransform = target.GetComponent<Transform>();
                        float x = targetTransform.position.x - t.position.x;
                        float y = targetTransform.position.y - t.position.y;
                        bool isXneg = x < 0;
                        bool isYneg = y < 0;
                        float a = y / x;
                        double arcTan = Math.Atan(a);
                        double subangle;
                        subangle = arcTan <= 45 ? arcTan - 45 + 180 : arcTan - 45;
                        double back2Tan = Math.Tan(subangle);

                        float x1 = (float)Math.Sqrt(Math.Abs(1 / (back2Tan * back2Tan + 1)));
                        float y1 = (float)Math.Sqrt(Math.Abs(back2Tan * back2Tan / (back2Tan * back2Tan + 1)));
                        x1 = isXneg && x1 > 0 ? -x1 : x1;
                        y1 = isYneg && y1 > 0 ? -y1 : y1;
                        vC3 = new Vector3(x1, y1);
                    }
                    t.Translate(vC3 * 5f * Time.deltaTime);
                };
                break;
            case "X":
                break;
            default:
                throw new Exception("No Attack Type");
        }
    }
}